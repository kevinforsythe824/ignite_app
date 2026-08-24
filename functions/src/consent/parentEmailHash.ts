import { createHmac } from 'crypto';

import { getParentEmailHmacSecret } from '../config/secrets';
import { normalizeParentEmail } from './normalizeEmail';

/**
 * Keyed abuse identifier for a parent email.
 * Uses HMAC-SHA256 — never unsalted SHA-256 of the email.
 */
export function hashParentEmailForAbuseKey(
  email: string,
  secret: string = getParentEmailHmacSecret(),
): string {
  const normalized = normalizeParentEmail(email);
  return createHmac('sha256', secret).update(normalized, 'utf8').digest('hex');
}
