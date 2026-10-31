import crypto from 'crypto';
import { serverEnv } from '@/config/env.server';
import { SystemLockModel, SystemSettingModel } from '@/lib/models';
import { encryptSecret, decryptSecret, EncryptedPayload } from '../../crypto';

interface StoredTokenValue {
  encrypted: EncryptedPayload;
  expiresAt: number;
}

// In-memory process cache (30-60s TTL)
let inMemoryToken: { token: string; expiresAt: number } | null = null;

const LOCK_ID = 'shiprocket_token_lock';
const SETTING_KEY = 'shiprocket_auth_token';
const NEGATIVE_CACHE_KEY = 'shiprocket_auth_failed';
const LEASE_MS = 8000; // 8 seconds lease
const WAITER_DEADLINE_MS = 10000; // 10 seconds waiter deadline
const LOGIN_TIMEOUT_MS = 5000; // 5 seconds external timeout
const NEGATIVE_CACHE_TTL_MS = 60000; // 60 seconds

export async function clearNegativeCache(): Promise<void> {
  await SystemSettingModel.deleteOne({ key: NEGATIVE_CACHE_KEY }).catch(() => {});
}

async function executeRemoteLoginWithTimeout(timeoutMs: number): Promise<string> {
  if (serverEnv.SHIPPING_PROVIDER === 'mock') {
    return `mock_sr_token_${Date.now()}`;
  }

  const email = serverEnv.SHIPROCKET_EMAIL;
  const password = serverEnv.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    throw new Error('SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD must be configured');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const is4xx = res.status >= 400 && res.status < 500;
      const bodyText = await res.text().catch(() => '');
      const err = new Error(`Shiprocket auth login failed with status ${res.status}: ${bodyText}`);
      (err as any).status = res.status;
      (err as any).is4xx = is4xx;
      throw err;
    }

    const data = await res.json();
    if (!data.token) {
      throw new Error('Shiprocket response missing token property');
    }

    return data.token;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Retrieves a valid Shiprocket JWT token with distributed lease locking,
 * waiter polling, 401 double-check guard, and AES-256-GCM encryption at rest.
 */
export async function getValidShiprocketToken(options?: { rejectedToken?: string }): Promise<string> {
  const rejected = options?.rejectedToken;
  const now = Date.now();

  // 1. Fast in-memory check (if not rejected and fresh)
  if (
    inMemoryToken &&
    inMemoryToken.token !== rejected &&
    inMemoryToken.expiresAt > now + 30000
  ) {
    return inMemoryToken.token;
  }

  // 2. Negative cache check (60s lockout strictly on 4xx credential failures)
  const negCache = await SystemSettingModel.findOne({ key: NEGATIVE_CACHE_KEY }).catch(() => null);
  if (negCache?.value?.blockedUntil && negCache.value.blockedUntil > now) {
    throw new Error('[SHIPROCKET] Authentication temporarily locked out due to recent credential failure (60s backoff)');
  }

  // 3. Database token check
  const setting = await SystemSettingModel.findOne({ key: SETTING_KEY }).catch(() => null);
  if (setting?.value?.encrypted) {
    try {
      const decrypted = decryptSecret(setting.value.encrypted);
      const expiresAt = setting.value.expiresAt || 0;

      // 401 Guard: If DB has a token different from rejected, return it immediately without locking!
      if (decrypted !== rejected && expiresAt > now + 3600 * 1000) {
        inMemoryToken = { token: decrypted, expiresAt: now + 30000 };
        return decrypted;
      }
    } catch {
      // If decryption fails, force refresh
    }
  }

  // 4. Acquire distributed lease lock with waiter polling
  const deadline = now + WAITER_DEADLINE_MS;
  const ownerUuid = crypto.randomUUID();

  while (Date.now() < deadline) {
    try {
      const nowLock = new Date();
      const lock = await SystemLockModel.findOneAndUpdate(
        {
          _id: LOCK_ID,
          $or: [{ expiresAt: { $lte: nowLock } }, { owner: ownerUuid }],
        },
        {
          $set: { owner: ownerUuid, expiresAt: new Date(Date.now() + LEASE_MS) },
        },
        { upsert: true, new: true }
      );

      if (lock && lock.owner === ownerUuid) {
        try {
          // Double-check DB after acquiring lock: another worker may have just refreshed it
          const recheck = await SystemSettingModel.findOne({ key: SETTING_KEY });
          if (recheck?.value?.encrypted) {
            try {
              const freshToken = decryptSecret(recheck.value.encrypted);
              if (freshToken !== rejected && recheck.value.expiresAt > Date.now() + 3600 * 1000) {
                inMemoryToken = { token: freshToken, expiresAt: Date.now() + 30000 };
                return freshToken;
              }
            } catch {
              // Ignore decrypt error, proceed to fetch
            }
          }

          // Authoritative external login (5s timeout)
          let newToken: string;
          try {
            newToken = await executeRemoteLoginWithTimeout(LOGIN_TIMEOUT_MS);
          } catch (loginErr: any) {
            if (loginErr?.is4xx) {
              await SystemSettingModel.updateOne(
                { key: NEGATIVE_CACHE_KEY },
                { $set: { value: { blockedUntil: Date.now() + NEGATIVE_CACHE_TTL_MS, reason: loginErr.message } } },
                { upsert: true }
              ).catch(() => {});
            }
            throw loginErr;
          }

          // Persist AES-256-GCM encrypted token with 7-day TTL
          const encrypted = encryptSecret(newToken);
          const expiresAt = Date.now() + 7 * 24 * 3600 * 1000;

          await SystemSettingModel.updateOne(
            { key: SETTING_KEY },
            { $set: { value: { encrypted, expiresAt } } },
            { upsert: true }
          );

          await SystemSettingModel.deleteOne({ key: NEGATIVE_CACHE_KEY }).catch(() => {});

          inMemoryToken = { token: newToken, expiresAt: Date.now() + 30000 };
          return newToken;
        } finally {
          // Release lock cleanly
          await SystemLockModel.deleteOne({ _id: LOCK_ID, owner: ownerUuid }).catch(() => {});
        }
      }
    } catch (err: any) {
      if (err.code !== 11000) {
        throw err;
      }
      // Duplicate-key 11000: lock busy
    }

    // Waiter backoff & poll DB for token refreshed by holder
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 100));

    const polled = await SystemSettingModel.findOne({ key: SETTING_KEY }).catch(() => null);
    if (polled?.value?.encrypted) {
      try {
        const candidate = decryptSecret(polled.value.encrypted);
        if (candidate !== rejected && polled.value.expiresAt > Date.now() + 3600 * 1000) {
          inMemoryToken = { token: candidate, expiresAt: Date.now() + 30000 };
          return candidate;
        }
      } catch {}
    }
  }

  throw new Error('[SHIPROCKET] Distributed token acquisition timed out after 10s');
}
