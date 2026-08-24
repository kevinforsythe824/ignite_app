import { ParentalConsentError } from '../domain/parentalConsent';

/** Normalize parent email in memory only — do not persist this form. */
export function normalizeParentEmail(email: string): string {
  return email.trim().toLowerCase();
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateParentEmail(email: string): string {
  const normalized = normalizeParentEmail(email);
  if (!normalized || !EMAIL_PATTERN.test(normalized)) {
    throw new ParentalConsentError(
      'invalid_argument',
      'Enter a valid parent or guardian email address.',
    );
  }
  return normalized;
}

/** Canonical form stored for later delivery (same as normalized for email). */
export function toCanonicalParentEmail(email: string): string {
  return validateParentEmail(email);
}
