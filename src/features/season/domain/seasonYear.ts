/**
 * Season year comes from a four-digit season id, not from startDate or a clock.
 */

const FOUR_DIGIT_SEASON_ID = /^\d{4}$/;

export type SeasonYearResult =
  | { status: 'year'; year: number }
  | { status: 'invalid'; reason: 'malformedSeasonId' };

export function resolveSeasonYear(seasonId: string): SeasonYearResult {
  if (typeof seasonId !== 'string' || !FOUR_DIGIT_SEASON_ID.test(seasonId)) {
    return { status: 'invalid', reason: 'malformedSeasonId' };
  }

  const year = Number(seasonId);
  if (!Number.isInteger(year)) {
    return { status: 'invalid', reason: 'malformedSeasonId' };
  }

  return { status: 'year', year };
}
