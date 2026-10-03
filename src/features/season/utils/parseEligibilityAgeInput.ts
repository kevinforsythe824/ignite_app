/**
 * Strict parse of the eligibility-age field.
 * Does not decide whether an integer may continue — that is canAdvanceFromEligibilityAge.
 * A decimal cannot collapse to its leading whole number.
 */
export type EligibilityAgeParse =
  | { status: 'empty' }
  | { status: 'notInteger' }
  | { status: 'integer'; age: number };

const WHOLE_NUMBER = /^(?:0|[1-9]\d*)$/;

export function parseEligibilityAgeInput(raw: string): EligibilityAgeParse {
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
