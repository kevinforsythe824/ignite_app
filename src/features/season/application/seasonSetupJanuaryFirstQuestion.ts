import {
  januaryFirstEligibilityCopy,
  type JanuaryFirstEligibilityCopyResult,
} from '../domain/januaryFirstEligibilityCopy';
import { resolveSeasonYear } from '../domain/seasonYear';

/**
 * January 1 age question for a resolved Season and the canonical Season calendar date.
 * Does not accept or store a date of birth.
 */
export function seasonSetupJanuaryFirstQuestion(
  seasonId: string,
  calendarDate: string,
): JanuaryFirstEligibilityCopyResult {
  const year = resolveSeasonYear(seasonId);
  if (year.status !== 'year') {
    return { status: 'invalid', reason: 'seasonYear' };
  }
  return januaryFirstEligibilityCopy(year.year, calendarDate);
}
