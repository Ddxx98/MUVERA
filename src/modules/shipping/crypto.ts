import crypto from 'crypto';
import { serverEnv } from '@/config/env.server';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for GCM

function getDerivedKey(): Buffer {
  const secret = serverEnv.TOKEN_ENCRYPTION_KEY || 'muvera_token_encryption_key_32bytes_2026';
  return crypto.createHash('sha256').update(secret).digest();
}

export interface EncryptedPayload {
  iv: string; // hex
  tag: string; // hex
  ciphertext: string; // hex
}

/**
 * Encrypts a plaintext string using AES-256-GCM with a fresh random IV.
 */
export function encryptSecret(plaintext: string): EncryptedPayload {
  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: encrypted,
  };
}

/**
 * Decrypts an AES-256-GCM payload. Throws if corrupted or tampered.
 */
export function decryptSecret(payload: EncryptedPayload | string): string {
  // Backwards compatibility if passed JSON string
  const obj: EncryptedPayload =
    typeof payload === 'string' ? JSON.parse(payload) : payload;

  if (!obj.iv || !obj.tag || !obj.ciphertext) {
    throw new Error('Invalid encrypted payload structure');
  }

  const key = getDerivedKey();
  const iv = Buffer.from(obj.iv, 'hex');
  const tag = Buffer.from(obj.tag, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(obj.ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
