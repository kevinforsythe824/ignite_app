import { isIsoCalendarDate } from '../domain/isoCalendarDate';
import { SEASON_STATUSES, type Season, type SeasonStatus } from '../domain/season';
import { SeasonLifecycleError } from '../errors/seasonLifecycleError';

/** One persisted Season root document. `id` is the path id. `data` is untrusted. */
export interface SeasonCatalogDocumentSnapshot {
  readonly id: string;
  readonly data: unknown;
}

function invalidCatalog(): never {
  throw new SeasonLifecycleError('invalid-season-catalog');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.trim() === value;
}

function isSeasonStatus(value: unknown): value is SeasonStatus {
  return typeof value === 'string' && (SEASON_STATUSES as readonly string[]).includes(value);
}

function optionalCalendarDate(
  data: Record<string, unknown>,
  field: 'sourceMaterialReleaseDate' | 'igniteAvailabilityDate',
): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(data, field)) {
    return undefined;
  }
  const value = data[field];
  if (!isIsoCalendarDate(value)) {
    invalidCatalog();
  }
  return value;
}

function mapSeasonCatalogDocument(snapshot: SeasonCatalogDocumentSnapshot): Season {
  if (!isPlainObject(snapshot) || !isNonEmptyString(snapshot.id) || !isPlainObject(snapshot.data)) {
    invalidCatalog();
  }

  const data = snapshot.data;
  if (!isNonEmptyString(data.seasonId) || data.seasonId !== snapshot.id) {
    invalidCatalog();
  }
  if (!isNonEmptyString(data.name)) {
    invalidCatalog();
  }
  if (!isIsoCalendarDate(data.startDate) || !isIsoCalendarDate(data.endDate)) {
    invalidCatalog();
  }
  if (data.startDate > data.endDate) {
    invalidCatalog();
  }
  if (!isSeasonStatus(data.status)) {
    invalidCatalog();
  }

  const season: Season = {
    seasonId: data.seasonId,
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    status: data.status,
  };

  const sourceMaterialReleaseDate = optionalCalendarDate(data, 'sourceMaterialReleaseDate');
  if (sourceMaterialReleaseDate !== undefined) {
    season.sourceMaterialReleaseDate = sourceMaterialReleaseDate;
  }
  const igniteAvailabilityDate = optionalCalendarDate(data, 'igniteAvailabilityDate');
  if (igniteAvailabilityDate !== undefined) {
    season.igniteAvailabilityDate = igniteAvailabilityDate;
  }

  return season;
}

/**
 * Maps Season root documents into domain Seasons.
 * Path id must equal persisted seasonId. Provenance and other persistence fields are dropped.
 * One malformed row fails the catalog.
 */
export function mapSeasonCatalogDocuments(
  snapshots: readonly SeasonCatalogDocumentSnapshot[],
): readonly Season[] {
  if (!Array.isArray(snapshots)) {
    invalidCatalog();
  }

  const seasons: Season[] = [];
  const seenIds = new Set<string>();
  for (const snapshot of snapshots) {
    const season = mapSeasonCatalogDocument(snapshot);
    if (seenIds.has(season.seasonId)) {
      invalidCatalog();
    }
    seenIds.add(season.seasonId);
    seasons.push(season);
  }
  return seasons;
}
