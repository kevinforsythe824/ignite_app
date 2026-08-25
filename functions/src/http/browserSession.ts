/**
 * Sealed HttpOnly browser session cookies for parent Hosting flow (ADR-009).
 * Session carries a sealed copy of the email capability so POST can call use cases
 * without leaving raw tokens in query strings or JavaScript storage.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

import { BROWSER_SESSION_TTL_MS } from '../config/consentPolicy';
import { ParentalConsentError } from '../domain/parentalConsent';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

export type BrowserSessionPurpose = 'approve' | 'confirm' | 'revoke';

export interface BrowserSessionPayload {
  purpose: BrowserSessionPurpose;
  requestId: string;
  exp: number;
  csrf: string;
  /** Raw capability sealed inside the cookie ciphertext (not separately readable). */
  capability: string;
}

export const CONSENT_SESSION_COOKIE = 'ignite_consent_session';

function keyFromSecret(secret: string): Buffer {
  return createHash('sha256').update(`browser-session:${secret}`, 'utf8').digest();
}

export function createCsrfToken(): string {
  return randomBytes(24).toString('base64url');
}

export function sealBrowserSession(
  payload: BrowserSessionPayload,
  secret: string,
): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyFromSecret(secret), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function unsealBrowserSession(
  sealed: string,
  secret: string,
  nowMs: number = Date.now(),
): BrowserSessionPayload {
  try {
    const buf = Buffer.from(sealed, 'base64url');
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
    const encrypted = buf.subarray(IV_LENGTH + 16);
    const decipher = createDecipheriv(ALGORITHM, keyFromSecret(secret), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
    const payload = JSON.parse(json) as BrowserSessionPayload;
    if (
      !payload.purpose ||
      !payload.requestId ||
      !payload.csrf ||
      !payload.exp ||
      !payload.capability
    ) {
      throw new Error('invalid');
    }
    if (payload.exp < nowMs) {
      throw new ParentalConsentError('expired', 'Browser session expired.');
    }
    return payload;
  } catch (error) {
    if (error instanceof ParentalConsentError) {
      throw error;
    }
    throw new ParentalConsentError('invalid_token', 'Invalid browser session.');
  }
}

export function buildSessionPayload(params: {
  purpose: BrowserSessionPurpose;
  requestId: string;
  capability: string;
  nowMs?: number;
  ttlMs?: number;
}): BrowserSessionPayload {
  const nowMs = params.nowMs ?? Date.now();
  return {
    purpose: params.purpose,
    requestId: params.requestId,
    capability: params.capability,
    exp: nowMs + (params.ttlMs ?? BROWSER_SESSION_TTL_MS),
    csrf: createCsrfToken(),
  };
}

export function sessionCookieHeader(sealed: string, maxAgeSec: number): string {
  return `${CONSENT_SESSION_COOKIE}=${sealed}; Path=/parent-consent; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSec}`;
}

export function clearSessionCookieHeader(): string {
  return `${CONSENT_SESSION_COOKIE}=; Path=/parent-consent; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function readCookie(
  cookieHeader: string | string[] | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }
  const header = Array.isArray(cookieHeader) ? cookieHeader.join(';') : cookieHeader;
  const parts = header.split(';');
  for (const part of parts) {
    const [rawName, ...rest] = part.trim().split('=');
    if (rawName === name) {
      return rest.join('=');
    }
  }
  return undefined;
}
