import { createHash, randomBytes, timingSafeEqual } from 'crypto';

import { TOKEN_BYTE_LENGTH } from '../config/consentPolicy';
import type { ParentalConsentTokenPurpose } from '../domain/parentalConsent';
import { ParentalConsentError } from '../domain/parentalConsent';

export interface GeneratedToken {
  purpose: ParentalConsentTokenPurpose;
  rawToken: string;
  tokenHash: string;
}

export function generateOpaqueToken(
  purpose: ParentalConsentTokenPurpose,
): GeneratedToken {
  const rawToken = randomBytes(TOKEN_BYTE_LENGTH).toString('base64url');
  return {
    purpose,
    rawToken,
    tokenHash: hashToken(rawToken),
  };
}

/** SHA-256 hash-at-rest for capability tokens (ADR-008). */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

export function verifyTokenHash(rawToken: string, expectedHash: string): boolean {
  if (!rawToken || !expectedHash) {
    return false;
  }
  const actual = Buffer.from(hashToken(rawToken), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  if (actual.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(actual, expected);
}

export function assertTokenMatches(
  rawToken: string,
  expectedHash: string | undefined,
  purpose: ParentalConsentTokenPurpose,
): void {
  if (!expectedHash || !verifyTokenHash(rawToken, expectedHash)) {
    throw new ParentalConsentError(
      'invalid_token',
      `Invalid ${purpose} token.`,
    );
  }
}

export function generateRequestId(): string {
  return randomBytes(16).toString('hex');
}
