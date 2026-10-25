import { access } from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { OFFICIAL_CONTENT_SCHEMA_VERSION } from './constants';
import { issue } from './errors';
import { mapSponsorVerseListToWorkbooks } from './mapSponsorVerseList';
import {
  official2027DraftSeason,
  officialDraftSeasonDateIssues,
  OFFICIAL_2027_DRAFT_SEASON_ID,
} from './officialDraftPackage';
import type { PipelineResult } from './pipeline';
import { runPipelineFromWorkbooks } from './pipeline';
import { readSponsorRulesVersion } from './readSponsorSummary';
import { readSponsorVerseListWorkbook } from './readSponsorVerseList';
import {
  WPFBQ_2027_SPONSOR_PROFILE,
  type SponsorSourceProfile,
  type SponsorWorkbookSource,
} from './sponsorSourceProfile';
import type { SponsorVerseList } from './sponsorSourceTypes';
import type { AuthoringWorkbookData, ValidationIssue } from './types';

export interface SponsorWorkbookLoad {
  readonly source: SponsorWorkbookSource;
  readonly verseList: SponsorVerseList;
  readonly rulesVersion: string;
}

export interface OfficialSponsorDraftResult {
  readonly status: 'passed' | 'failed';
  /** Successful Excel parses. One per profile source, including Senior once. */
  readonly workbookReadCount: number;
  readonly rulesVersion?: string;
  readonly loads: readonly SponsorWorkbookLoad[];
  readonly pipeline: PipelineResult;
}

function failedPipeline(
  errors: readonly ValidationIssue[],
  seasonId?: string,
  schemaVersion = OFFICIAL_CONTENT_SCHEMA_VERSION,
): PipelineResult {
  return {
    status: 'failed',
    workbooks: [],
    report: {
      status: 'failed',
      schemaVersion,
      seasonId,
      errors: [...errors],
      warnings: [],
    },
  };
}

async function readSponsorSourceOnce(
  directory: string,
  source: SponsorWorkbookSource,
): Promise<
  | { readonly ok: true; readonly parsed: true; readonly load: SponsorWorkbookLoad }
  | { readonly ok: false; readonly parsed: boolean; readonly errors: readonly ValidationIssue[] }
> {
  const filePath = path.join(directory, path.basename(source.fileName));
  const workbookName = source.fileName;
  try {
    await access(filePath);
  } catch {
    return {
      ok: false,
      parsed: false,
      errors: [
        issue({
          code: 'missing_file',
          workbook: workbookName,
          reason: `Workbook file "${workbookName}" was not found.`,
        }),
      ],
    };
  }

  let workbook: ExcelJS.Workbook;
  try {
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
  } catch {
    return {
      ok: false,
      parsed: false,
      errors: [
        issue({
          code: 'unreadable_workbook',
          workbook: workbookName,
          reason: `Workbook file "${workbookName}" could not be read as an Excel workbook.`,
        }),
      ],
    };
  }

  const verse = readSponsorVerseListWorkbook(workbook, workbookName);
  const rules = readSponsorRulesVersion(workbook, workbookName);
  const errors = [...(verse.ok ? [] : verse.errors), ...(rules.ok ? [] : rules.errors)];
  if (!verse.ok || !rules.ok || errors.length > 0) {
    return { ok: false, parsed: true, errors };
  }
  return {
    ok: true,
    parsed: true,
    load: { source, verseList: verse.verseList, rulesVersion: rules.rulesVersion },
  };
}

function rulesVersionErrors(loads: readonly SponsorWorkbookLoad[]): ValidationIssue[] {
  const versions = [...new Set(loads.map((load) => load.rulesVersion))];
  if (versions.length <= 1) {
    return [];
  }
  return loads.map((load) =>
    issue({
      code: 'rules_version_mismatch',
      workbook: load.verseList.workbookName,
      sheet: 'Summary',
      field: 'Rules version',
      reason: `Rules version "${load.rulesVersion}" does not match the other sponsor workbooks (${versions.join(', ')}).`,
    }),
  );
}

/**
 * Reads each profile workbook once, maps every MaterialSet target, and runs
 * validate → convert → package validation → reconcile → fingerprint.
 * Cadet is included only when the profile lists it. The draft is not written
 * and is not treated as a complete importable season package.
 */
export async function buildOfficialSponsorDraft(input: {
  directory: string;
  profile?: SponsorSourceProfile;
  /**
   * Required season dates. Omitted or invalid dates fail before any workbook
   * is treated as an official configuration. There is no January 1 default.
   */
  seasonDates?: { readonly startDate?: string; readonly endDate?: string };
} = { directory: '' }): Promise<OfficialSponsorDraftResult> {
  const profile = input.profile ?? WPFBQ_2027_SPONSOR_PROFILE;
  const dateErrors = officialDraftSeasonDateIssues(input.seasonDates);
  if (dateErrors.length > 0) {
    return {
      status: 'failed',
      workbookReadCount: 0,
      loads: [],
      pipeline: failedPipeline(dateErrors, profile.seasonId),
    };
  }

  if (profile.seasonId !== OFFICIAL_2027_DRAFT_SEASON_ID) {
    return {
      status: 'failed',
      workbookReadCount: 0,
      loads: [],
      pipeline: failedPipeline([
        issue({
          code: 'season_id_mismatch',
          field: 'seasonId',
          reason: `Official draft mapping uses season "${OFFICIAL_2027_DRAFT_SEASON_ID}".`,
        }),
      ]),
    };
  }

  const loads: SponsorWorkbookLoad[] = [];
  const readErrors: ValidationIssue[] = [];
  let workbookReadCount = 0;

  for (const source of profile.sources) {
    const parsed = await readSponsorSourceOnce(input.directory, source);
    if (parsed.parsed) {
      workbookReadCount += 1;
    }
    if (!parsed.ok) {
      readErrors.push(...parsed.errors);
      continue;
    }
    loads.push(parsed.load);
  }

  if (readErrors.length > 0) {
    return {
      status: 'failed',
      workbookReadCount,
      loads: [],
      pipeline: failedPipeline(readErrors, profile.seasonId),
    };
  }

  const versionErrors = rulesVersionErrors(loads);
  const rulesVersion = loads[0]?.rulesVersion;
  if (versionErrors.length > 0 || !rulesVersion) {
    return {
      status: 'failed',
      workbookReadCount,
      rulesVersion,
      loads,
      pipeline: failedPipeline(
        versionErrors.length > 0
          ? versionErrors
          : [
              issue({
                code: 'missing_rules_version',
                reason: 'Sponsor rules version was not read.',
              }),
            ],
        profile.seasonId,
      ),
    };
  }

  const resolvedSeason = official2027DraftSeason(rulesVersion, input.seasonDates);
  if (!resolvedSeason.ok) {
    return {
      status: 'failed',
      workbookReadCount,
      rulesVersion,
      loads,
      pipeline: failedPipeline(resolvedSeason.errors, profile.seasonId),
    };
  }
  const season = resolvedSeason.season;
  const workbooks: AuthoringWorkbookData[] = [];
  const mapErrors: ValidationIssue[] = [];
  for (const load of loads) {
    const mapped = mapSponsorVerseListToWorkbooks({
      verseList: load.verseList,
      materialSets: load.source.materialSets,
      season,
    });
    if (!mapped.ok) {
      mapErrors.push(...mapped.errors);
      continue;
    }
    workbooks.push(...mapped.workbooks);
  }

  if (mapErrors.length > 0) {
    return {
      status: 'failed',
      workbookReadCount,
      rulesVersion,
      loads,
      pipeline: failedPipeline(mapErrors, profile.seasonId, season.schemaVersion),
    };
  }

  const pipeline = runPipelineFromWorkbooks(workbooks, { requireAllOfficialDivisions: false });
  return {
    status: pipeline.status,
    workbookReadCount,
    rulesVersion,
    loads,
    pipeline,
  };
}
