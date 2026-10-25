import { isIsoCalendarDate } from '../../src/features/season/domain/isoCalendarDate';
import { OFFICIAL_CONTENT_SCHEMA_VERSION } from './constants';
import { issue } from './errors';
import type { ValidationIssue } from './types';

/**
 * Local pipeline inputs for the in-memory 2027 official draft package.
 * These are not a committee release and were not read from Firebase.
 * startDate and endDate are supplied by the caller. This module does not
 * invent them, derive them from the season id, or mark them approved.
 * igniteAvailabilityDate and sourceMaterialReleaseDate are omitted so this
 * draft is not mistaken for an installed season document.
 *
 * Calendar checks use the season-domain helper `isIsoCalendarDate` and require
 * startDate on or before endDate, the same structural rule as season catalog
 * rows. The content pipeline does not apply the further catalog rule that
 * igniteAvailabilityDate must fall on or before endDate. The draft omits that
 * field.
 */
export const OFFICIAL_2027_DRAFT_SEASON_ID = '2027';
export const OFFICIAL_2027_DRAFT_SEASON_NAME = '2027 official draft';
export const OFFICIAL_2027_DRAFT_SEASON_STATUS = 'draft' as const;

const ISO_DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

export interface OfficialDraftPackageInput {
  readonly seasonId: string;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: typeof OFFICIAL_2027_DRAFT_SEASON_STATUS;
  readonly sourceVersion: string;
  readonly schemaVersion: typeof OFFICIAL_CONTENT_SCHEMA_VERSION;
}

/** Caller-supplied season dates. Absent fields are invalid, not filled in. */
export interface OfficialDraftSeasonDates {
  readonly startDate?: string;
  readonly endDate?: string;
}

export type OfficialDraftSeasonResult =
  | { readonly ok: true; readonly season: OfficialDraftPackageInput }
  | { readonly ok: false; readonly errors: readonly ValidationIssue[] };

/** sourceVersion carries the sponsor Summary rules version and no file path. */
export function officialDraftSourceVersion(rulesVersion: string): string {
  return `official-2027-draft rules ${rulesVersion}`;
}

function readOfficialDraftDate(
  field: 'startDate' | 'endDate',
  value: string | undefined,
  errors: ValidationIssue[],
): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(
      issue({
        code: 'missing_required_field',
        field,
        reason: `Season ${field} is required. Pass an explicit ISO calendar date (YYYY-MM-DD). Official conversion does not default this date.`,
      }),
    );
    return undefined;
  }
  if (!ISO_DATE_SHAPE.test(value)) {
    errors.push(
      issue({
        code: 'invalid_date',
        field,
        reason: `Season ${field} "${value}" must be an ISO calendar date (YYYY-MM-DD).`,
      }),
    );
    return undefined;
  }
  if (!isIsoCalendarDate(value)) {
    errors.push(
      issue({
        code: 'invalid_date',
        field,
        reason: `Season ${field} "${value}" is not a real calendar date.`,
      }),
    );
    return undefined;
  }
  return value;
}

/**
 * Errors when official conversion was not given a real season date range.
 * A missing config is not turned into January 1 or December 31.
 */
export function officialDraftSeasonDateIssues(
  dates: OfficialDraftSeasonDates | undefined,
): ValidationIssue[] {
  if (dates === undefined) {
    return [
      issue({
        code: 'missing_season_dates',
        field: 'seasonDates',
        reason:
          'Official draft conversion requires explicit season startDate and endDate. Dates are not inferred from the season id and are not defaulted.',
      }),
    ];
  }

  const errors: ValidationIssue[] = [];
  const startDate = readOfficialDraftDate('startDate', dates.startDate, errors);
  const endDate = readOfficialDraftDate('endDate', dates.endDate, errors);
  if (startDate && endDate && startDate > endDate) {
    errors.push(
      issue({
        code: 'invalid_date_range',
        field: 'endDate',
        reason: `Season endDate ${endDate} is before startDate ${startDate}. startDate must be on or before endDate.`,
      }),
    );
  }
  return errors;
}

/**
 * Builds the draft season row only when the caller supplied real calendar dates.
 * Status stays draft. sourceVersion is the rules version label and no path.
 */
export function official2027DraftSeason(
  rulesVersion: string,
  dates?: OfficialDraftSeasonDates,
): OfficialDraftSeasonResult {
  const errors = officialDraftSeasonDateIssues(dates);
  if (errors.length > 0 || !dates || typeof dates.startDate !== 'string' || typeof dates.endDate !== 'string') {
    return { ok: false, errors };
  }
  return {
    ok: true,
    season: {
      seasonId: OFFICIAL_2027_DRAFT_SEASON_ID,
      name: OFFICIAL_2027_DRAFT_SEASON_NAME,
      startDate: dates.startDate,
      endDate: dates.endDate,
      status: OFFICIAL_2027_DRAFT_SEASON_STATUS,
      sourceVersion: officialDraftSourceVersion(rulesVersion),
      schemaVersion: OFFICIAL_CONTENT_SCHEMA_VERSION,
    },
  };
}
