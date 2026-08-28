import { parentalConsentCopy } from '../copy/parentalConsentCopy';

/** Obvious email shape only. Not a security rule. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateParentEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (trimmed.length === 0) {
    return parentalConsentCopy.validation.emailRequired;
  }
  if (!EMAIL_SHAPE.test(trimmed)) {
    return parentalConsentCopy.validation.emailInvalid;
  }
  return undefined;
}
