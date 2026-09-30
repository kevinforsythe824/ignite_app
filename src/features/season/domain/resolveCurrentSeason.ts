import { isIsoCalendarDate } from './isoCalendarDate';
import type { SeasonSelectionPolicy } from './seasonSelectionPolicy';
import { SEASON_STATUSES, type Season, type SeasonStatus } from './season';

/**
 * Pure current-Season resolution.
 * `today` is an already-resolved YYYY-MM-DD. No clock and no environment branch.
 * Zero matches → none. One match → current. More than one → ambiguous (no guess).
 */

export type CurrentSeasonInvalidReason = 'calendarDate';

export type CurrentSeasonResult =
  | { status: 'invalid'; reason: CurrentSeasonInvalidReason }
  | { status: 'none' }
  | { status: 'current'; season: Season }
  | { status: 'ambiguous' };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim() === value;
}

function isSeasonStatus(value: unknown): value is SeasonStatus {
  return typeof value === 'string' && (SEASON_STATUSES as readonly string[]).includes(value);
}

function isStructurallyValidSeason(value: unknown): value is Season {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const row = value as Record<string, unknown>;
  if (!isNonEmptyString(row.seasonId) || !isNonEmptyString(row.name)) {
    return false;
  }
  if (!isIsoCalendarDate(row.startDate) || !isIsoCalendarDate(row.endDate)) {
    return false;
  }
  if (row.startDate > row.endDate) {
    return false;
  }
  if (!isSeasonStatus(row.status)) {
    return false;
  }
  if (
    row.sourceMaterialReleaseDate !== undefined &&
    !isIsoCalendarDate(row.sourceMaterialReleaseDate)
  ) {
    return false;
  }
  if (row.igniteAvailabilityDate !== undefined && !isIsoCalendarDate(row.igniteAvailabilityDate)) {
    return false;
  }

  return true;
}

function isCurrentSeasonCandidate(
  value: unknown,
  today: string,
  permittedStatuses: readonly SeasonStatus[],
): value is Season {
  if (!isStructurallyValidSeason(value)) {
    return false;
  }
  if (value.status === 'archived') {
    return false;
  }
  if (!permittedStatuses.includes(value.status)) {
    return false;
  }
  if (!isIsoCalendarDate(value.igniteAvailabilityDate)) {
    return false;
  }
  if (value.igniteAvailabilityDate > value.endDate) {
    return false;
  }

  return today >= value.igniteAvailabilityDate && today <= value.endDate;
}

export function resolveCurrentSeason(
  seasons: readonly Season[],
  today: string,
  selectionPolicy: SeasonSelectionPolicy,
): CurrentSeasonResult {
  if (!isIsoCalendarDate(today)) {
    return { status: 'invalid', reason: 'calendarDate' };
  }

  const permittedStatuses = selectionPolicy.permittedStatuses;
  if (!Array.isArray(permittedStatuses) || !Array.isArray(seasons)) {
    return { status: 'none' };
  }

  const candidates: Season[] = [];
  for (const season of seasons) {
    if (isCurrentSeasonCandidate(season, today, permittedStatuses)) {
      candidates.push(season);
    }
  }

  if (candidates.length === 0) {
    return { status: 'none' };
  }

  if (candidates.length === 1) {
    const season = candidates[0];
    if (season) {
      return { status: 'current', season };
    }
  }

  return { status: 'ambiguous' };
}
