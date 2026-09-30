import { isIsoCalendarDate } from './isoCalendarDate';
import type { SeasonSelectionPolicy } from './seasonSelectionPolicy';
import { SEASON_STATUSES, type Season, type SeasonStatus } from './season';

/**
 * Pure current-Season resolution.
 * `today` is an already-resolved YYYY-MM-DD. No clock and no environment branch.
 * A malformed catalog or selection policy is invalid. It is not treated as "no season".
 * Zero structurally valid non-candidates → none. One candidate → current.
 * More than one candidate → ambiguous (no guess).
 */

export type CurrentSeasonInvalidReason = 'calendarDate' | 'catalog' | 'selectionPolicy';

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

/**
 * A row may stay in the catalog when it is not current (missing availability,
 * future, ended, archived, or a status the policy does not allow).
 * A corrupt row fails the whole catalog. Availability after endDate is corrupt.
 */
function isAcceptableCatalogSeason(value: unknown): value is Season {
  if (!isStructurallyValidSeason(value)) {
    return false;
  }
  if (
    value.igniteAvailabilityDate !== undefined &&
    value.igniteAvailabilityDate > value.endDate
  ) {
    return false;
  }
  return true;
}

function isValidSelectionPolicy(value: unknown): value is SeasonSelectionPolicy {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const row = value as Record<string, unknown>;
  const keys = Object.keys(row);
  if (keys.length !== 1 || keys[0] !== 'permittedStatuses') {
    return false;
  }

  const permittedStatuses = row.permittedStatuses;
  if (!Array.isArray(permittedStatuses)) {
    return false;
  }

  return permittedStatuses.every((status) => isSeasonStatus(status));
}

function isCurrentSeasonCandidate(
  season: Season,
  today: string,
  permittedStatuses: readonly SeasonStatus[],
): boolean {
  if (season.status === 'archived') {
    return false;
  }
  if (!permittedStatuses.includes(season.status)) {
    return false;
  }
  if (!isIsoCalendarDate(season.igniteAvailabilityDate)) {
    return false;
  }
  if (season.igniteAvailabilityDate > season.endDate) {
    return false;
  }

  return today >= season.igniteAvailabilityDate && today <= season.endDate;
}

export function resolveCurrentSeason(
  seasons: unknown,
  today: string,
  selectionPolicy: unknown,
): CurrentSeasonResult {
  if (!isIsoCalendarDate(today)) {
    return { status: 'invalid', reason: 'calendarDate' };
  }

  if (!isValidSelectionPolicy(selectionPolicy)) {
    return { status: 'invalid', reason: 'selectionPolicy' };
  }

  if (!Array.isArray(seasons)) {
    return { status: 'invalid', reason: 'catalog' };
  }

  const catalog: Season[] = [];
  for (const season of seasons) {
    if (!isAcceptableCatalogSeason(season)) {
      return { status: 'invalid', reason: 'catalog' };
    }
    catalog.push(season);
  }

  const candidates = catalog.filter((season) =>
    isCurrentSeasonCandidate(season, today, selectionPolicy.permittedStatuses),
  );

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
