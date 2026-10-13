import { OFFICIAL_DIVISION_IDS, type DivisionId } from '../division';
import type { ParticipationType } from '../quizzerSeasonParticipation';

/**
 * Official eligibility age bands (integer January 1 age). Named policy constants — not UI literals.
 * Caller supplies January 1 eligibility age; this module does no DOB math.
 *
 * First-year means first year ever participating in Bible Quizzing, not first year in a division.
 * The flag is required only for ages 15–18. Outside that window it is ignored.
 * Experienced is never offered below age 12.
 * The resolver returns an allow-list only; it does not auto-select a division.
 */
/** Ages under 2 remain provisional pending official sponsor confirmation. */
const MIN_COMPETITIVE_AGE = 2;
/** Ages 2–5: Cadet, Beginner, or Junior. */
const CADET_BEGINNER_OR_JUNIOR_MAX_AGE = 5;
/** Ages 6–8: Beginner or Junior. */
const BEGINNER_OR_JUNIOR_MAX_AGE = 8;
/** Ages 9–11: Junior only. */
const JUNIOR_MAX_AGE = 11;
/** Ages 12–14: Intermediate or Experienced. First-year flag is ignored. */
const INTERMEDIATE_OR_EXPERIENCED_MAX_AGE = 14;
/** Ages 15–18 require the first-year-ever flag. */
const FIRST_YEAR_WINDOW_MIN_AGE = 15;
const FIRST_YEAR_WINDOW_MAX_AGE = 18;
/** Age ≥ 19: Study Track. No max-age cap. */
const STUDY_TRACK_MIN_AGE = 19;

export type EligibilityInvalidReason = 'ineligibleAge' | 'firstYearRequired' | 'nonIntegerAge';

export interface EligibilityInput {
  /** January 1 season-scoped eligibility age. Not a stored DOB. */
  eligibilityAge: number;
  /** Required only for ages 15–18. Ignored outside that window. */
  isFirstYearQuizzer?: boolean;
}

export type EligibilityResult =
  | { status: 'invalid'; reason: EligibilityInvalidReason }
  | {
      status: 'eligible';
      participationType: ParticipationType;
      allowedDivisionIds: readonly DivisionId[];
    };

function invalid(reason: EligibilityInvalidReason): EligibilityResult {
  return { status: 'invalid', reason };
}

function competitive(allowedDivisionIds: readonly DivisionId[]): EligibilityResult {
  return {
    status: 'eligible',
    participationType: 'competitive',
    allowedDivisionIds,
  };
}

/**
 * Pure, deterministic eligibility. No React, no Firebase, no DOB.
 * Age ≥ 19 is Study Track with the official division allow-list and no max-age cap.
 */
export function resolveParticipationOptions(input: EligibilityInput): EligibilityResult {
  const { eligibilityAge, isFirstYearQuizzer } = input;

  if (!Number.isFinite(eligibilityAge) || !Number.isInteger(eligibilityAge)) {
    return invalid('nonIntegerAge');
  }

  if (eligibilityAge < MIN_COMPETITIVE_AGE) {
    return invalid('ineligibleAge');
  }

  if (eligibilityAge >= STUDY_TRACK_MIN_AGE) {
    return {
      status: 'eligible',
      participationType: 'studyTrack',
      allowedDivisionIds: OFFICIAL_DIVISION_IDS,
    };
  }

  if (eligibilityAge <= CADET_BEGINNER_OR_JUNIOR_MAX_AGE) {
    return competitive(['cadet', 'beginner', 'junior']);
  }

  if (eligibilityAge <= BEGINNER_OR_JUNIOR_MAX_AGE) {
    return competitive(['beginner', 'junior']);
  }

  if (eligibilityAge <= JUNIOR_MAX_AGE) {
    return competitive(['junior']);
  }

  if (eligibilityAge <= INTERMEDIATE_OR_EXPERIENCED_MAX_AGE) {
    return competitive(['intermediate', 'experienced']);
  }

  if (
    eligibilityAge >= FIRST_YEAR_WINDOW_MIN_AGE &&
    eligibilityAge <= FIRST_YEAR_WINDOW_MAX_AGE
  ) {
    if (isFirstYearQuizzer === undefined) {
      return invalid('firstYearRequired');
    }
    return competitive(isFirstYearQuizzer ? ['intermediate', 'experienced'] : ['experienced']);
  }

  return invalid('ineligibleAge');
}
