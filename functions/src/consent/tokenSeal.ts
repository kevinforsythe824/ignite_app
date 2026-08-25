/**
 * Seal raw confirmation tokens for Task Queue retry coherence.
 * Ciphertext may be stored briefly; plaintext never in ordinary Firestore fields/logs.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

import { ParentalConsentError } from '../domain/parentalConsent';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function keyFromSecret(secret: string): Buffer {
  return createHash('sha256').update(secret, 'utf8').digest();
}

export function sealToken(rawToken: string, secret: string): string {
  if (!secret) {
    throw new ParentalConsentError('internal', 'Token seal secret is not configured.');
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyFromSecret(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(rawToken, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function unsealToken(sealed: string, secret: string): string {
  if (!secret) {
    throw new ParentalConsentError('internal', 'Token seal secret is not configured.');
  }
  try {
    const buf = Buffer.from(sealed, 'base64url');
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
    const encrypted = buf.subarray(IV_LENGTH + 16);
    const decipher = createDecipheriv(ALGORITHM, keyFromSecret(secret), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    throw new ParentalConsentError('internal', 'Unable to unseal confirmation token.');
  }
}
