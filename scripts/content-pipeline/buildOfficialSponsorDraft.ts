import { access } from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { OFFICIAL_CONTENT_SCHEMA_VERSION } from './constants';
import { issue } from './errors';
import { generateSponsorAnnotations } from './generateSponsorAnnotations';
import { mapSponsorVerseListToWorkbooks } from './mapSponsorVerseList';
import {
  official2027DraftSeason,
  officialDraftSeasonDateIssues,
  OFFICIAL_2027_DRAFT_SEASON_ID,
} from './officialDraftPackage';
import type { PipelineResult } from './pipeline';
import { runPipelineFromWorkbooks } from './pipeline';
import { readSponsorRulesVersion } from './readSponsorSummary';
import { interpretSponsorCell } from './sponsorCell';
import { readSponsorFrequencyWords } from './readSponsorFrequencyWords';
import { readSponsorVerseListWorkbook } from './readSponsorVerseList';
import {
  WPFBQ_2027_SPONSOR_PROFILE,
  type SponsorSourceProfile,
  type SponsorWorkbookSource,
} from './sponsorSourceProfile';
import type { SponsorFrequencyWords } from './sponsorFrequencyTypes';
import type { SponsorVerseList } from './sponsorSourceTypes';
import type { AuthoringWorkbookData, ValidationIssue } from './types';

export interface SponsorWorkbookLoad {
  readonly source: SponsorWorkbookSource;
  readonly verseList: SponsorVerseList;
  readonly frequencyWords: SponsorFrequencyWords;
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
  const frequency = readSponsorFrequencyWords(workbook, workbookName);
  const identity = sponsorCorpusIdentityIssue(workbook, workbookName);
  const errors = [
    ...(identity ? [identity] : []),
    ...(verse.ok ? [] : verse.errors),
    ...(rules.ok ? [] : rules.errors),
    ...(frequency.ok ? [] : frequency.errors),
  ];
  if (!verse.ok || !rules.ok || !frequency.ok || errors.length > 0) {
    return { ok: false, parsed: true, errors };
  }
  return {
    ok: true,
    parsed: true,
    load: {
      source,
      verseList: verse.verseList,
      frequencyWords: frequency.frequencyWords,
      rulesVersion: rules.rulesVersion,
    },
  };
}

const OFFICIAL_SPONSOR_FILE_NAME = /^WPFBQ_\d{4}_([A-Za-z]+)_Data_Workbook\.xlsx$/i;

/**
 * Official WPFBQ filenames identify a division. A directory prefix or letter
 * case still resolves to that file. Any other division, or an unrecognized
 * official-pattern name, fails before the workbook is read. Fixture names that
 * do not use this pattern stay explicit profile configuration.
 */
function officialSponsorFileIssue(source: SponsorWorkbookSource): ValidationIssue | undefined {
  const baseName = path.basename(source.fileName);
  if (!OFFICIAL_SPONSOR_FILE_NAME.test(baseName)) {
    return undefined;
  }
  const approved = WPFBQ_2027_SPONSOR_PROFILE.sources.find(
    (item) => path.basename(item.fileName).toLowerCase() === baseName.toLowerCase(),
  );
  if (!approved) {
    return issue({
      code: 'unrecognized_sponsor_workbook',
      workbook: baseName,
      field: 'fileName',
      reason: `Workbook "${baseName}" is not an authorized 2027 sponsor file.`,
    });
  }
  const allowedDivisions = new Set(approved.materialSets.map((target) => target.divisionId));
  for (const target of source.materialSets) {
    if (!allowedDivisions.has(target.divisionId)) {
      return issue({
        code: 'workbook_division_mismatch',
        workbook: baseName,
        field: 'divisionId',
        reason: `Workbook "${baseName}" cannot be associated with division "${target.divisionId}".`,
      });
    }
    if (!target.materialSetId.startsWith(`${target.divisionId}-`)) {
      return issue({
        code: 'workbook_division_mismatch',
        workbook: baseName,
        field: 'materialSetId',
        reason: `MaterialSet "${target.materialSetId}" does not belong to division "${target.divisionId}" for workbook "${baseName}".`,
      });
    }
  }
  return undefined;
}

/**
 * Official workbooks title themselves in Summary, for example
 * "WPFBQ 2027 — Beginner Corpus". A file whose title names a different
 * division is not read as that other division. Fixtures with no corpus title
 * stay on the explicit profile.
 */
function sponsorCorpusIdentityIssue(
  workbook: ExcelJS.Workbook,
  workbookName: string,
): ValidationIssue | undefined {
  const baseName = path.basename(workbookName);
  const token = OFFICIAL_SPONSOR_FILE_NAME.exec(baseName)?.[1]?.toLowerCase();
  if (!token) {
    return undefined;
  }
  const sheet = workbook.getWorksheet('Summary');
  if (!sheet) {
    return undefined;
  }
  let corpus: string | undefined;
  sheet.eachRow((row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (corpus !== undefined) {
        return;
      }
      const value = interpretSponsorCell(cell.value);
      if (value.status === 'text' && value.text.includes('Corpus')) {
        corpus = value.text;
      }
    });
  });
  if (corpus === undefined || corpus.toLowerCase().includes(token)) {
    return undefined;
  }
  return issue({
    code: 'workbook_division_mismatch',
    workbook: baseName,
    sheet: 'Summary',
    field: 'fileName',
    reason: `Summary "${corpus}" does not match sponsor file "${baseName}".`,
  });
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
 * Reads each profile workbook once, generates official annotations, maps every
 * MaterialSet target, and runs validate → convert → package validation →
 * reconcile → fingerprint. The default profile lists Cadet, Beginner, Junior,
 * and Senior. Senior is read once. This function does not write a package and
 * does not import it. Package validation on this path allows a caller-supplied
 * partial profile so an incomplete draft can be inspected. The default
 * validator still rejects a package that is missing an official division.
 * Passing validation does not authorize import, activation, or publication.
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
    const fileIssue = officialSponsorFileIssue(source);
    if (fileIssue) {
      readErrors.push(fileIssue);
      continue;
    }
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
    const generated = generateSponsorAnnotations({
      verseList: load.verseList,
      frequencyWords: load.frequencyWords,
    });
    if (!generated.ok) {
      mapErrors.push(...generated.errors);
      continue;
    }
    const mapped = mapSponsorVerseListToWorkbooks({
      verseList: load.verseList,
      materialSets: load.source.materialSets,
      season,
      annotationsByCardNumber: generated.annotationsByCardNumber,
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
