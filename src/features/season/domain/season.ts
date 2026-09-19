/**
 * Season is the curriculum and configuration boundary for one quiz year (PRD §§5–7).
 * Dates are configuration strings — never hard-coded business dates.
 */

/** ISO date string (YYYY-MM-DD or ISO-8601). Domain stays Date-free. */
export type IsoDateString = string;

export const SEASON_STATUSES = [
  'draft',
  'committeeValidated',
  'published',
  'activeLocked',
  'archived',
] as const;

export type SeasonStatus = (typeof SEASON_STATUSES)[number];

export interface Season {
  seasonId: string;
  name: string;
  sourceMaterialReleaseDate?: IsoDateString;
  igniteAvailabilityDate?: IsoDateString;
  startDate: IsoDateString;
  endDate: IsoDateString;
  status: SeasonStatus;
}

/** Authoritative content cannot change once Active/Locked or Archived (PRD §§5.3, 6). */
const CONTENT_IMMUTABLE_STATUSES: ReadonlySet<SeasonStatus> = new Set([
  'activeLocked',
  'archived',
]);

/** Users may select a Published or Active/Locked season; not draft, committee, or archived. */
const SELECTABLE_STATUSES: ReadonlySet<SeasonStatus> = new Set([
  'published',
  'activeLocked',
]);

export function isContentImmutable(status: SeasonStatus): boolean {
  return CONTENT_IMMUTABLE_STATUSES.has(status);
}

export function isSeasonSelectable(status: SeasonStatus): boolean {
  return SELECTABLE_STATUSES.has(status);
}
