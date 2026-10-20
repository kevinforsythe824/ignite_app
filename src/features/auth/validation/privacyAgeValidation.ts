/**
 * Strict, pure parser and routing helper for current-age screening on PrivacyAgeScreen.
 * Does not persist age, does not collect a date of birth, and does not import from Season Setup.
 */

export const STANDARD_ACCOUNT_MIN_CURRENT_AGE = 13;

export type PrivacyAgeParseResult =
  | { status: 'empty' }
  | { status: 'notInteger' }
  | { status: 'integer'; age: number };

export type PrivacyAgeRoute = 'under13' | 'standard';

const WHOLE_NUMBER = /^(?:0|[1-9]\d*)$/;

export function parsePrivacyAgeInput(raw: string): PrivacyAgeParseResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { status: 'empty' };
  }
  if (!WHOLE_NUMBER.test(trimmed)) {
    return { status: 'notInteger' };
  }
  const age = Number(trimmed);
  if (!Number.isSafeInteger(age)) {
    return { status: 'notInteger' };
  }
  return { status: 'integer', age };
}

export function resolvePrivacyAgeRoute(age: number): PrivacyAgeRoute {
  return age < STANDARD_ACCOUNT_MIN_CURRENT_AGE ? 'under13' : 'standard';
}
