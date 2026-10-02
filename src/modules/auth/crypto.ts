import crypto from 'crypto';
import { serverEnv } from '@/config/env.server';

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
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derivedKey, 'hex'));
}

/**
 * Generates a signed, tamper-proof session token with payload and signature.
 */
export function signSessionToken(payload: Record<string, unknown>): string {
  const secret = serverEnv.ADMIN_SECRET_KEY || 'muvera_auth_secret_key_2026';
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies and decodes a signed session token.
 */
export function verifySessionToken<T = Record<string, unknown>>(token: string): T | null {
  if (!token || !token.includes('.')) return null;
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const secret = serverEnv.ADMIN_SECRET_KEY || 'muvera_auth_secret_key_2026';
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const jsonStr = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}
