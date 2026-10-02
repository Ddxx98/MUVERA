import { randomBytes, createHash } from 'crypto';

/**
 * Generates a high-entropy 256-bit random token in base64url format for email links.
 */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Computes SHA-256 digest of a token so only the hash is stored on the server.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
