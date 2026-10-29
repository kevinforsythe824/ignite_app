import { access } from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { issue } from './errors';
import type { SponsorInterpretedCell } from './sponsorCell';
import { interpretSponsorCell } from './sponsorCell';
import type { SponsorSourceProfile, SponsorWorkbookSource } from './sponsorSourceProfile';
import {
  SPONSOR_VERSE_LIST_COLUMNS,
  SPONSOR_VERSE_LIST_SHEET,
  type SponsorBattlefield,
  type SponsorVerseList,
  type SponsorVerseListColumn,
  type SponsorVerseListResult,
  type SponsorVerseListRow,
} from './sponsorSourceTypes';
import type { ValidationIssue } from './types';

const CANONICAL_NON_NEGATIVE_INTEGER = /^(0|[1-9]\d*)$/;

const TEXT_COLUMNS = [
  'Section',
  'Topic',
  'Question',
  'Reference',
  'Book',
  'Unique Beginning',
  'Unique Ending',
  'Verse Text',
] as const satisfies readonly SponsorVerseListColumn[];

type TextColumn = (typeof TEXT_COLUMNS)[number];

type IntegerRead =
  | { readonly status: 'blank' }
  | { readonly status: 'integer'; readonly value: number }
  | { readonly status: 'unexpected' }
  | { readonly status: 'not_integer' };

type TextRead =
  | { readonly status: 'blank' }
  | { readonly status: 'text'; readonly text: string }
  | { readonly status: 'unexpected' };

type BattlefieldRead =
  | { readonly status: 'blank' }
  | { readonly status: 'value'; readonly value: SponsorBattlefield }
  | { readonly status: 'unexpected' };

interface CardAttempt {
  readonly sourceRow: number;
  readonly issues: ValidationIssue[];
  readonly seq?: number;
  readonly reference?: string;
  readonly row?: SponsorVerseListRow;
}

export interface SponsorWorkbookVerseList {
  readonly source: SponsorWorkbookSource;
  readonly verseList: SponsorVerseList;
}

export type SponsorWorkbookReadResult =
  | {
      readonly ok: true;
      readonly source: SponsorWorkbookSource;
      readonly verseList: SponsorVerseList;
    }
  | { readonly ok: false; readonly errors: readonly ValidationIssue[] };

export type SponsorProfileReadResult =
  | { readonly ok: true; readonly reads: readonly SponsorWorkbookVerseList[] }
  | { readonly ok: false; readonly errors: readonly ValidationIssue[] };

function workbookIssue(
  workbookName: string,
  partial: {
    code: string;
    reason: string;
    row?: number;
    field?: string;
    sheet?: string;
  },
): ValidationIssue {
  return issue({
    code: partial.code,
    reason: partial.reason,
    workbook: workbookName,
    sheet: partial.sheet ?? SPONSOR_VERSE_LIST_SHEET,
    row: partial.row,
    field: partial.field,
  });
}

function readInteger(cell: SponsorInterpretedCell): IntegerRead {
  if (cell.status === 'blank') {
    return { status: 'blank' };
  }
  if (cell.status === 'invalid') {
    return { status: 'unexpected' };
  }
  if (cell.status === 'number') {
    return Number.isSafeInteger(cell.value)
      ? { status: 'integer', value: cell.value }
      : { status: 'not_integer' };
  }
  if (!CANONICAL_NON_NEGATIVE_INTEGER.test(cell.text)) {
    return { status: 'not_integer' };
  }
  const value = Number.parseInt(cell.text, 10);
  return Number.isSafeInteger(value) ? { status: 'integer', value } : { status: 'not_integer' };
}

function readChapterOrVerse(cell: SponsorInterpretedCell): IntegerRead {
  if (cell.status !== 'number') {
    return readInteger(cell);
  }
  return Number.isSafeInteger(cell.value) && cell.value > 0
    ? { status: 'integer', value: cell.value }
    : { status: 'not_integer' };
}

function readText(cell: SponsorInterpretedCell): TextRead {
  if (cell.status === 'blank') {
    return { status: 'blank' };
  }
  if (cell.status === 'text') {
    return { status: 'text', text: cell.text };
  }
  if (cell.status === 'invalid') {
    return { status: 'unexpected' };
  }
  return { status: 'unexpected' };
}

function readBattlefield(cell: SponsorInterpretedCell): BattlefieldRead {
  if (cell.status === 'blank') {
    return { status: 'blank' };
  }
  if (cell.status === 'text') {
    return { status: 'value', value: cell.text };
  }
  if (cell.status === 'number') {
    return Number.isFinite(cell.value)
      ? { status: 'value', value: cell.value }
      : { status: 'unexpected' };
  }
  return { status: 'unexpected' };
}

function readHeaders(
  row: ExcelJS.Row,
  workbookName: string,
): { readonly columns: ReadonlyMap<string, number>; readonly errors: readonly ValidationIssue[] } {
  const errors: ValidationIssue[] = [];
  const columns = new Map<string, number>();

  row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const interpreted = interpretSponsorCell(cell.value);
    if (interpreted.status === 'blank') {
      return;
    }
    if (interpreted.status !== 'text') {
      errors.push(
        workbookIssue(workbookName, {
          code: 'unexpected_cell_type',
          row: 1,
          field: `column ${colNumber}`,
          reason: 'Header cell must be text.',
        }),
      );
      return;
    }
    const name = interpreted.text.trim();
    if (name.length === 0) {
      return;
    }
    if (columns.has(name)) {
      errors.push(
        workbookIssue(workbookName, {
          code: 'duplicate_header',
          row: 1,
          field: name,
          reason: `Header "${name}" appears more than once.`,
        }),
      );
      return;
    }
    columns.set(name, colNumber);
  });

  for (const required of SPONSOR_VERSE_LIST_COLUMNS) {
    if (!columns.has(required)) {
      errors.push(
        workbookIssue(workbookName, {
          code: 'missing_header',
          row: 1,
          field: required,
          reason: `Required header "${required}" is missing.`,
        }),
      );
    }
  }

  return { columns, errors };
}

function mappedCells(
  row: ExcelJS.Row,
  columns: ReadonlyMap<string, number>,
): ReadonlyMap<SponsorVerseListColumn, SponsorInterpretedCell> {
  const cells = new Map<SponsorVerseListColumn, SponsorInterpretedCell>();
  for (const column of SPONSOR_VERSE_LIST_COLUMNS) {
    const colNumber = columns.get(column);
    const value = colNumber === undefined ? null : row.getCell(colNumber).value;
    cells.set(column, interpretSponsorCell(value));
  }
  return cells;
}

function isBlankCardRow(
  cells: ReadonlyMap<SponsorVerseListColumn, SponsorInterpretedCell>,
): boolean {
  for (const column of SPONSOR_VERSE_LIST_COLUMNS) {
    const cell = cells.get(column);
    if (!cell || cell.status !== 'blank') {
      return false;
    }
  }
  return true;
}

function parseCardRow(
  cells: ReadonlyMap<SponsorVerseListColumn, SponsorInterpretedCell>,
  sourceRow: number,
  workbookName: string,
): CardAttempt {
  const issues: ValidationIssue[] = [];
  let seq: number | undefined;
  let section: string | undefined;
  let topic: string | undefined;
  let question: string | undefined;
  let reference: string | undefined;
  let book: string | undefined;
  let uniqueBeginning: string | undefined;
  let uniqueEnding: string | undefined;
  let verseText: string | undefined;
  let battlefield: SponsorBattlefield | undefined;
  let ch: number | undefined;
  let v: number | undefined;

  const seqRead = readInteger(cells.get('Seq') ?? { status: 'blank' });
  if (seqRead.status === 'blank') {
    issues.push(
      workbookIssue(workbookName, {
        code: 'missing_seq',
        row: sourceRow,
        field: 'Seq',
        reason: 'Seq is required.',
      }),
    );
  } else if (seqRead.status === 'unexpected') {
    issues.push(
      workbookIssue(workbookName, {
        code: 'unexpected_cell_type',
        row: sourceRow,
        field: 'Seq',
        reason: 'Seq must be an integer.',
      }),
    );
  } else if (seqRead.status === 'not_integer' || seqRead.value < 1) {
    issues.push(
      workbookIssue(workbookName, {
        code: 'invalid_seq',
        row: sourceRow,
        field: 'Seq',
        reason: 'Seq must be a positive integer.',
      }),
    );
  } else {
    seq = seqRead.value;
  }

  const textValues = new Map<TextColumn, string>();
  for (const column of TEXT_COLUMNS) {
    const textRead = readText(cells.get(column) ?? { status: 'blank' });
    if (textRead.status === 'unexpected') {
      issues.push(
        workbookIssue(workbookName, {
          code: 'unexpected_cell_type',
          row: sourceRow,
          field: column,
          reason: `${column} must be text.`,
        }),
      );
      continue;
    }
    if (textRead.status === 'blank') {
      if (column === 'Section' || column === 'Reference' || column === 'Verse Text') {
        const code =
          column === 'Section'
            ? 'missing_section'
            : column === 'Reference'
              ? 'missing_reference'
              : 'missing_verse_text';
        const reason =
          column === 'Section'
            ? 'Section is required.'
            : column === 'Reference'
              ? 'Reference is required.'
              : 'Verse text is required.';
        issues.push(
          workbookIssue(workbookName, {
            code,
            row: sourceRow,
            field: column,
            reason,
          }),
        );
      }
      continue;
    }
    textValues.set(column, textRead.text);
  }

  section = textValues.get('Section');
  topic = textValues.get('Topic');
  question = textValues.get('Question');
  reference = textValues.get('Reference');
  book = textValues.get('Book');
  uniqueBeginning = textValues.get('Unique Beginning');
  uniqueEnding = textValues.get('Unique Ending');
  verseText = textValues.get('Verse Text');

  const battlefieldRead = readBattlefield(cells.get('Battlefield') ?? { status: 'blank' });
  if (battlefieldRead.status === 'unexpected') {
    issues.push(
      workbookIssue(workbookName, {
        code: 'unexpected_cell_type',
        row: sourceRow,
        field: 'Battlefield',
        reason: 'Battlefield must be text or a number.',
      }),
    );
  } else if (battlefieldRead.status === 'value') {
    battlefield = battlefieldRead.value;
  }

  for (const column of ['Ch', 'V'] as const) {
    const cell = cells.get(column) ?? { status: 'blank' };
    const integerRead = readChapterOrVerse(cell);
    if (integerRead.status === 'blank') {
      continue;
    }
    if (integerRead.status === 'unexpected') {
      issues.push(
        workbookIssue(workbookName, {
          code: 'unexpected_cell_type',
          row: sourceRow,
          field: column,
          reason: `${column} must be an integer when provided.`,
        }),
      );
      continue;
    }
    if (integerRead.status === 'not_integer') {
      issues.push(
        workbookIssue(workbookName, {
          code: 'invalid_integer',
          row: sourceRow,
          field: column,
          reason:
            cell.status === 'number'
              ? `${column} must be a positive whole number greater than zero.`
              : `${column} must be an integer when provided.`,
        }),
      );
      continue;
    }
    if (column === 'Ch') {
      ch = integerRead.value;
    } else {
      v = integerRead.value;
    }
  }

  if (
    issues.length > 0 ||
    seq === undefined ||
    section === undefined ||
    reference === undefined ||
    verseText === undefined
  ) {
    return {
      sourceRow,
      issues,
      ...(seq === undefined ? {} : { seq }),
      ...(reference === undefined ? {} : { reference }),
    };
  }

  const row: SponsorVerseListRow = {
    sourceRow,
    seq,
    section,
    reference,
    verseText,
    ...(battlefield === undefined ? {} : { battlefield }),
    ...(topic === undefined ? {} : { topic }),
    ...(question === undefined ? {} : { question }),
    ...(book === undefined ? {} : { book }),
    ...(ch === undefined ? {} : { ch }),
    ...(v === undefined ? {} : { v }),
    ...(uniqueBeginning === undefined ? {} : { uniqueBeginning }),
    ...(uniqueEnding === undefined ? {} : { uniqueEnding }),
  };
  return { sourceRow, issues, seq, reference, row };
}

function sequenceAndReferenceIssues(
  attempts: readonly CardAttempt[],
  workbookName: string,
): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  const seenSeq = new Map<number, number>();
  const seenReference = new Map<string, number>();
  const cardCount = attempts.length;

  attempts.forEach((attempt, index) => {
    if (attempt.seq !== undefined) {
      const firstSeqRow = seenSeq.get(attempt.seq);
      if (firstSeqRow !== undefined) {
        errors.push(
          workbookIssue(workbookName, {
            code: 'duplicate_seq',
            row: attempt.sourceRow,
            field: 'Seq',
            reason: `Seq duplicates row ${firstSeqRow}.`,
          }),
        );
      } else {
        seenSeq.set(attempt.seq, attempt.sourceRow);
      }
      const expected = index + 1;
      if (attempt.seq !== expected) {
        errors.push(
          workbookIssue(workbookName, {
            code: 'sequence_gap',
            row: attempt.sourceRow,
            field: 'Seq',
            reason: `Seq must run from 1 through ${cardCount} in source order. Expected ${expected} and found ${attempt.seq}.`,
          }),
        );
      }
    }

    if (attempt.reference !== undefined) {
      const firstReferenceRow = seenReference.get(attempt.reference);
      if (firstReferenceRow !== undefined) {
        errors.push(
          workbookIssue(workbookName, {
            code: 'duplicate_reference',
            row: attempt.sourceRow,
            field: 'Reference',
            reason: `Reference duplicates row ${firstReferenceRow}.`,
          }),
        );
      } else {
        seenReference.set(attempt.reference, attempt.sourceRow);
      }
    }
  });

  return errors;
}

function sectionsInSourceOrder(rows: readonly SponsorVerseListRow[]): readonly string[] {
  const sections: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!seen.has(row.section)) {
      seen.add(row.section);
      sections.push(row.section);
    }
  }
  return sections;
}

export function readSponsorVerseListWorkbook(
  workbook: ExcelJS.Workbook,
  workbookName: string,
): SponsorVerseListResult {
  const sheet = workbook.getWorksheet(SPONSOR_VERSE_LIST_SHEET);
  if (!sheet) {
    return {
      ok: false,
      errors: [
        workbookIssue(workbookName, {
          code: 'missing_sheet',
          reason: `Required sheet "${SPONSOR_VERSE_LIST_SHEET}" is missing.`,
        }),
      ],
    };
  }

  const headers = readHeaders(sheet.getRow(1), workbookName);
  if (headers.errors.length > 0) {
    return { ok: false, errors: headers.errors };
  }

  const attempts: CardAttempt[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const cells = mappedCells(sheet.getRow(rowNumber), headers.columns);
    if (isBlankCardRow(cells)) {
      continue;
    }
    attempts.push(parseCardRow(cells, rowNumber, workbookName));
  }

  if (attempts.length === 0) {
    return {
      ok: false,
      errors: [
        workbookIssue(workbookName, {
          code: 'empty_verse_list',
          reason: 'Verse List must contain at least one Scripture Card.',
        }),
      ],
    };
  }

  const errors = [
    ...attempts.flatMap((attempt) => attempt.issues),
    ...sequenceAndReferenceIssues(attempts, workbookName),
  ];
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const rows = attempts.map((attempt) => {
    if (!attempt.row) {
      throw new Error(`Verse List row ${attempt.sourceRow} failed closed without an error.`);
    }
    return attempt.row;
  });

  return {
    ok: true,
    verseList: {
      workbookName,
      sheetName: SPONSOR_VERSE_LIST_SHEET,
      rows,
      sections: sectionsInSourceOrder(rows),
    },
  };
}

export async function readSponsorVerseListBuffer(
  buffer: Buffer,
  workbookName: string,
): Promise<SponsorVerseListResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return readSponsorVerseListWorkbook(workbook, workbookName);
}

export async function readSponsorVerseListFile(filePath: string): Promise<SponsorVerseListResult> {
  const workbookName = path.basename(filePath);
  try {
    await access(filePath);
  } catch {
    return {
      ok: false,
      errors: [
        issue({
          code: 'missing_file',
          workbook: workbookName,
          reason: `Workbook file "${workbookName}" was not found.`,
        }),
      ],
    };
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    return readSponsorVerseListWorkbook(workbook, workbookName);
  } catch {
    return {
      ok: false,
      errors: [
        issue({
          code: 'unreadable_workbook',
          workbook: workbookName,
          reason: `Workbook file "${workbookName}" could not be read as an Excel workbook.`,
        }),
      ],
    };
  }
}

function sourceFilePath(directory: string, source: SponsorWorkbookSource): string {
  return path.join(directory, path.basename(source.fileName));
}

/**
 * One workbook read. The returned source keeps every MaterialSet target,
 * including both Intermediate and Experienced for the Senior workbook.
 */
export async function readSponsorWorkbookFile(
  filePath: string,
  source: SponsorWorkbookSource,
): Promise<SponsorWorkbookReadResult> {
  const parsed = await readSponsorVerseListFile(filePath);
  if (!parsed.ok) {
    return parsed;
  }
  return { ok: true, source, verseList: parsed.verseList };
}

export async function readSponsorWorkbookBuffer(
  buffer: Buffer,
  source: SponsorWorkbookSource,
): Promise<SponsorWorkbookReadResult> {
  const parsed = await readSponsorVerseListBuffer(buffer, source.fileName);
  if (!parsed.ok) {
    return parsed;
  }
  return { ok: true, source, verseList: parsed.verseList };
}

/**
 * Reads each profile source once. The default 2027 profile includes Cadet.
 * Any workbook error fails the profile read and withholds every verse list.
 */
export async function readSponsorProfileVerseLists(
  directory: string,
  profile: SponsorSourceProfile,
): Promise<SponsorProfileReadResult> {
  const reads: SponsorWorkbookVerseList[] = [];
  const errors: ValidationIssue[] = [];

  for (const source of profile.sources) {
    const parsed = await readSponsorWorkbookFile(sourceFilePath(directory, source), source);
    if (!parsed.ok) {
      errors.push(...parsed.errors);
      continue;
    }
    reads.push({ source: parsed.source, verseList: parsed.verseList });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, reads };
}
