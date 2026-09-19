import { OFFICIAL_DIVISION_IDS, type DivisionId } from '../division';
import type { ParticipationType } from '../quizzerSeasonParticipation';

/**
 * Eligibility age bands (PRD §8.2–8.3). Named policy constants — not UI literals.
 * Caller supplies January 1 eligibility age; this module does no DOB math.
 */
const MIN_COMPETITIVE_AGE = 2;
const CADET_OR_BEGINNER_MAX_AGE = 4;
const BEGINNER_ONLY_MAX_AGE = 8;
const JUNIOR_MAX_AGE = 11;
const INTERMEDIATE_STANDARD_MAX_AGE = 14;
const FIRST_YEAR_WINDOW_MIN_AGE = 15;
const FIRST_YEAR_WINDOW_MAX_AGE = 18;
const STUDY_TRACK_MIN_AGE = 19;

export type EligibilityInvalidReason = 'ineligibleAge' | 'firstYearRequired' | 'nonIntegerAge';

export interface EligibilityInput {
  /** January 1 season-scoped eligibility age. Not a stored DOB. */
  eligibilityAge: number;
  /** Required only for ages 15–18. */
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
 * Age ≥ 19 is Study Track with no invented max-age cap.
 * There is no exceptional younger Experienced path.
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

  if (eligibilityAge <= CADET_OR_BEGINNER_MAX_AGE) {
    return competitive(['cadet', 'beginner']);
  }

  if (eligibilityAge <= BEGINNER_ONLY_MAX_AGE) {
    return competitive(['beginner']);
  }

  if (eligibilityAge <= JUNIOR_MAX_AGE) {
    return competitive(['junior']);
  }

  if (eligibilityAge <= INTERMEDIATE_STANDARD_MAX_AGE) {
    return competitive(['intermediate']);
  }

  if (
    eligibilityAge >= FIRST_YEAR_WINDOW_MIN_AGE &&
    eligibilityAge <= FIRST_YEAR_WINDOW_MAX_AGE
  ) {
    if (isFirstYearQuizzer === undefined) {
      return invalid('firstYearRequired');
    }
    return competitive(isFirstYearQuizzer ? ['intermediate'] : ['experienced']);
  }

  return invalid('ineligibleAge');
}
