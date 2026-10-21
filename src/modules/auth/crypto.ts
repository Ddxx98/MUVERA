import 'server-only';
import crypto from 'crypto';

// ─── Password hashing (Node.js crypto, server-only) ───────────────────────────

/**
 * Hashes a plaintext password using PBKDF2 with a random 16-byte salt and 100,000 iterations.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a plaintext password against a stored salt:hash string.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;

  const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  // Both buffers must be 64 bytes hex (128 chars). Pad the derived key if needed.
  try {
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derivedKey, 'hex'));
  } catch {
    return false;
  }
}

// ─── Legacy session token (backward-compatible, HMAC-signed JSON blob) ────────
//
// Used for sessions that were created before the jose JWT upgrade.
// New sessions will use signJwt / verifyJwt below.

/**
 * Generates a signed, tamper-proof legacy token with payload and HMAC signature.
 * @deprecated Use signJwt instead for new sessions.
 */
export function signSessionToken(payload: Record<string, unknown>): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SECRET_KEY || 'muvera_admin_session_jwt_secret_2026';
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies and decodes a legacy signed session token.
 * @deprecated Use verifyJwt instead for new sessions.
 */
export function verifySessionToken<T = Record<string, unknown>>(token: string): T | null {
  if (!token || !token.includes('.')) return null;
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SECRET_KEY || 'muvera_admin_session_jwt_secret_2026';
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  // Constant-time comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length) return null;

  try {
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  try {
    const jsonStr = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    // Check expiry for legacy tokens
    if (parsed.expiresAt && typeof parsed.expiresAt === 'number' && Date.now() > parsed.expiresAt) {
      return null;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

// ─── Modern JWT signing (jose-compatible, used by Edge middleware) ─────────────
//
// These produce standard compact JWTs that the Edge middleware can verify
// with jose without any DB calls.

export type JwtAudience = 'customer' | 'admin';

export interface JwtPayload {
  sub: string;       // userId
  email: string;
  name: string;
  role: string;
  aud: JwtAudience;
  iss: string;       // 'muvera'
  iat: number;
  exp: number;
}

/**
 * Signs a compact JWT using HS256 (HMAC-SHA256).
 * The secret is selected based on the audience:
 *  - aud=admin    → ADMIN_SESSION_SECRET
 *  - aud=customer → SESSION_SECRET
 */
export function signJwt(
  payload: Omit<JwtPayload, 'iss' | 'iat' | 'exp'>,
  expiresInSeconds: number
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iss: 'muvera',
    iat: now,
    exp: now + expiresInSeconds,
  };

  const secret =
    payload.aud === 'admin'
      ? process.env.ADMIN_SESSION_SECRET || 'muvera_admin_session_jwt_secret_2026'
      : process.env.SESSION_SECRET || 'muvera_customer_session_secret_2026';

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signingInput = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', secret).update(signingInput).digest('base64url');
  return `${signingInput}.${sig}`;
}

/**
 * Verifies and decodes a compact JWT signed by signJwt.
 * Validates: signature, expiry, issuer, audience.
 */
export function verifyJwt(token: string, expectedAudience: JwtAudience): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;

    const secret =
      expectedAudience === 'admin'
        ? process.env.ADMIN_SESSION_SECRET || 'muvera_admin_session_jwt_secret_2026'
        : process.env.SESSION_SECRET || 'muvera_customer_session_secret_2026';

    const signingInput = `${header}.${body}`;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(signingInput)
      .digest('base64url');

    const sigBuf = Buffer.from(sig);
    const expectedSigBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedSigBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedSigBuf)) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as JwtPayload;

    // Validate issuer and audience
    if (payload.iss !== 'muvera') return null;
    if (payload.aud !== expectedAudience) return null;

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}
