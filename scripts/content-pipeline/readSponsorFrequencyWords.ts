import ExcelJS from 'exceljs';
import { issue } from './errors';
import { interpretSponsorCell, type SponsorInterpretedCell } from './sponsorCell';
import {
  SPONSOR_FREQUENCY_COLUMNS,
  SPONSOR_FREQUENCY_MAX_TIER,
  SPONSOR_FREQUENCY_MIN_TIER,
  SPONSOR_FREQUENCY_SHEET,
  SPONSOR_REFERENCE_SEPARATOR,
  SPONSOR_REPEATS_IN_VERSE_FLAG,
  type SponsorFrequencyColumn,
  type SponsorFrequencyEntry,
  type SponsorFrequencyWordsResult,
} from './sponsorFrequencyTypes';
import { normalizeApostrophes } from './sponsorWordMatch';
import type { ValidationIssue } from './types';

const CANONICAL_POSITIVE_INTEGER = /^[1-9]\d*$/;
const TIER_SHEET_NAME = /^(\d+)x Words\b/;

function frequencyIssue(
  workbookName: string,
  partial: { code: string; reason: string; row?: number; field?: string; sheet?: string },
): ValidationIssue {
  return issue({
    code: partial.code,
    reason: partial.reason,
    workbook: workbookName,
    sheet: partial.sheet ?? SPONSOR_FREQUENCY_SHEET,
    row: partial.row,
    field: partial.field,
  });
}

function normalizeWord(word: string): string {
  return normalizeApostrophes(word).toLowerCase();
}

function readPositiveInteger(cell: SponsorInterpretedCell): number | undefined {
  if (cell.status === 'number') {
    return Number.isSafeInteger(cell.value) && cell.value >= 1 ? cell.value : undefined;
  }
  if (cell.status === 'text' && CANONICAL_POSITIVE_INTEGER.test(cell.text.trim())) {
    const value = Number.parseInt(cell.text.trim(), 10);
    return Number.isSafeInteger(value) ? value : undefined;
  }
  return undefined;
}

function readHeaderColumns(
  row: ExcelJS.Row,
  workbookName: string,
): { columns: ReadonlyMap<SponsorFrequencyColumn, number>; errors: ValidationIssue[] } {
  const seen = new Map<string, number>();
  const errors: ValidationIssue[] = [];
  row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const interpreted = interpretSponsorCell(cell.value);
    if (interpreted.status === 'blank') {
      return;
    }
    if (interpreted.status !== 'text') {
      errors.push(
        frequencyIssue(workbookName, {
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
    if (seen.has(name)) {
      errors.push(
        frequencyIssue(workbookName, {
          code: 'duplicate_header',
          row: 1,
          field: name,
          reason: `Header "${name}" appears more than once.`,
        }),
      );
      return;
    }
    seen.set(name, colNumber);
  });

  const columns = new Map<SponsorFrequencyColumn, number>();
  for (const required of SPONSOR_FREQUENCY_COLUMNS) {
    const colNumber = seen.get(required);
    if (colNumber === undefined) {
      errors.push(
        frequencyIssue(workbookName, {
          code: 'missing_header',
          row: 1,
          field: required,
          reason: `Required header "${required}" is missing.`,
        }),
      );
    } else {
      columns.set(required, colNumber);
    }
  }
  return { columns, errors };
}

function cellAt(
  row: ExcelJS.Row,
  columns: ReadonlyMap<SponsorFrequencyColumn, number>,
  column: SponsorFrequencyColumn,
): SponsorInterpretedCell {
  const colNumber = columns.get(column);
  const value = colNumber === undefined ? null : row.getCell(colNumber).value;
  return interpretSponsorCell(value);
}

function parseRow(
  row: ExcelJS.Row,
  rowNumber: number,
  columns: ReadonlyMap<SponsorFrequencyColumn, number>,
  workbookName: string,
): { entry?: SponsorFrequencyEntry; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const fail = (code: string, field: SponsorFrequencyColumn | string, reason: string): void => {
    issues.push(frequencyIssue(workbookName, { code, row: rowNumber, field, reason }));
  };

  const wordCell = cellAt(row, columns, 'Word');
  let word: string | undefined;
  if (wordCell.status === 'blank') {
    fail('missing_word', 'Word', 'Word is required.');
  } else if (wordCell.status !== 'text') {
    fail('unexpected_cell_type', 'Word', 'Word must be text.');
  } else if (wordCell.text.trim().length === 0) {
    fail('invalid_word', 'Word', 'Word must not be blank.');
  } else {
    word = wordCell.text;
  }

  const tier = readPositiveInteger(cellAt(row, columns, 'Class'));
  if (tier === undefined) {
    fail('invalid_class', 'Class', 'Class must be a whole number.');
  } else if (tier < SPONSOR_FREQUENCY_MIN_TIER || tier > SPONSOR_FREQUENCY_MAX_TIER) {
    fail(
      'invalid_class',
      'Class',
      `Class must be ${SPONSOR_FREQUENCY_MIN_TIER} through ${SPONSOR_FREQUENCY_MAX_TIER}.`,
    );
  }

  const verses = readPositiveInteger(cellAt(row, columns, 'Verses'));
  if (verses === undefined) {
    fail('invalid_verses', 'Verses', 'Verses must be a whole number of at least 1.');
  }

  const occurrences = readPositiveInteger(cellAt(row, columns, 'Occurrences'));
  if (occurrences === undefined) {
    fail('invalid_occurrences', 'Occurrences', 'Occurrences must be a whole number of at least 1.');
  } else if (verses !== undefined && occurrences < verses) {
    fail(
      'inconsistent_occurrences',
      'Occurrences',
      `Occurrences ${occurrences} cannot be fewer than Verses ${verses}.`,
    );
  }

  if (tier !== undefined && verses !== undefined && tier !== verses) {
    fail(
      'inconsistent_class',
      'Class',
      `Class ${tier} must equal the distinct-verse count Verses ${verses}.`,
    );
  }

  const repeatsCell = cellAt(row, columns, 'Repeats In Verse');
  let repeatsInVerse: boolean | undefined;
  if (repeatsCell.status === 'blank') {
    repeatsInVerse = false;
  } else if (repeatsCell.status === 'text' && repeatsCell.text.trim() === SPONSOR_REPEATS_IN_VERSE_FLAG) {
    repeatsInVerse = true;
  } else {
    fail(
      'invalid_repeats_flag',
      'Repeats In Verse',
      `Repeats In Verse must be blank or "${SPONSOR_REPEATS_IN_VERSE_FLAG}".`,
    );
  }
  if (repeatsInVerse !== undefined && verses !== undefined && occurrences !== undefined) {
    const occurrencesRepeat = occurrences > verses;
    if (repeatsInVerse !== occurrencesRepeat) {
      fail(
        'inconsistent_repeats_flag',
        'Repeats In Verse',
        `Repeats In Verse ${repeatsInVerse ? '"YES"' : 'blank'} disagrees with Occurrences ${occurrences} vs Verses ${verses}.`,
      );
    }
  }

  const referencesCell = cellAt(row, columns, 'References');
  let references: string[] | undefined;
  if (referencesCell.status === 'blank') {
    fail('missing_references', 'References', 'References is required.');
  } else if (referencesCell.status !== 'text') {
    fail('unexpected_cell_type', 'References', 'References must be text.');
  } else {
    const parts = referencesCell.text.split(SPONSOR_REFERENCE_SEPARATOR).map((part) => part.trim());
    if (parts.some((part) => part.length === 0)) {
      fail('malformed_references', 'References', 'References contains an empty reference.');
    } else if (new Set(parts).size !== parts.length) {
      fail('duplicate_reference', 'References', 'References lists the same reference more than once.');
    } else if (verses !== undefined && parts.length !== verses) {
      fail(
        'inconsistent_references',
        'References',
        `References lists ${parts.length} verse(s) but Verses is ${verses}.`,
      );
    } else {
      references = parts;
    }
  }

  if (
    issues.length > 0 ||
    word === undefined ||
    tier === undefined ||
    verses === undefined ||
    occurrences === undefined ||
    repeatsInVerse === undefined ||
    references === undefined
  ) {
    return { issues };
  }

  return {
    issues,
    entry: { sourceRow: rowNumber, word, tier, verses, occurrences, repeatsInVerse, references },
  };
}

function crossRowIssues(
  entries: readonly SponsorFrequencyEntry[],
  workbookName: string,
): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  const firstByWord = new Map<string, SponsorFrequencyEntry>();
  for (const entry of entries) {
    const key = normalizeWord(entry.word);
    const previous = firstByWord.get(key);
    if (!previous) {
      firstByWord.set(key, entry);
      continue;
    }
    if (previous.tier !== entry.tier) {
      errors.push(
        frequencyIssue(workbookName, {
          code: 'conflicting_class',
          row: entry.sourceRow,
          field: 'Class',
          reason: `Word "${entry.word}" has Class ${entry.tier} but row ${previous.sourceRow} already lists Class ${previous.tier} for the same word.`,
        }),
      );
    } else {
      errors.push(
        frequencyIssue(workbookName, {
          code: 'duplicate_frequency_word',
          row: entry.sourceRow,
          field: 'Word',
          reason: `Word "${entry.word}" duplicates row ${previous.sourceRow}.`,
        }),
      );
    }
  }
  return errors;
}

function tierSheetIssues(
  workbook: ExcelJS.Workbook,
  entries: readonly SponsorFrequencyEntry[],
  workbookName: string,
): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  const rollupByTier = new Map<number, Set<string>>();
  for (const entry of entries) {
    const set = rollupByTier.get(entry.tier) ?? new Set<string>();
    set.add(normalizeWord(entry.word));
    rollupByTier.set(entry.tier, set);
  }

  const tierSheetsByNumber = new Map<number, { sheet: ExcelJS.Worksheet; records: readonly TierSheetRecord[] }>();
  for (const sheet of workbook.worksheets) {
    const match = TIER_SHEET_NAME.exec(sheet.name);
    if (!match) {
      continue;
    }
    const tier = Number.parseInt(match[1] ?? '', 10);
    if (!Number.isInteger(tier) || tier < SPONSOR_FREQUENCY_MIN_TIER || tier > SPONSOR_FREQUENCY_MAX_TIER) {
      errors.push(
        frequencyIssue(workbookName, {
          code: 'invalid_tier_sheet',
          sheet: sheet.name,
          reason: `Tier sheet "${sheet.name}" is outside the supported ${SPONSOR_FREQUENCY_MIN_TIER}–${SPONSOR_FREQUENCY_MAX_TIER} range.`,
        }),
      );
      continue;
    }
    const read = readTierSheetRecords(sheet, workbookName);
    errors.push(...read.errors);
    const existing = tierSheetsByNumber.get(tier);
    if (existing) {
      errors.push(
        frequencyIssue(workbookName, {
          code: 'duplicate_tier_sheet',
          sheet: sheet.name,
          reason: `Worksheets "${existing.sheet.name}" and "${sheet.name}" both represent frequency tier ${tier}.`,
        }),
      );
      continue;
    }
    tierSheetsByNumber.set(tier, { sheet, records: read.records });
  }

  for (const [tier, rollupWords] of rollupByTier) {
    const found = tierSheetsByNumber.get(tier);
    if (!found) {
      errors.push(
        frequencyIssue(workbookName, {
          code: 'missing_tier_sheet',
          field: 'Class',
          reason: `Class ${tier} appears in "${SPONSOR_FREQUENCY_SHEET}" but its tier sheet is missing.`,
        }),
      );
      continue;
    }
    const { sheet, records } = found;
    const sheetWords = new Set(records.map((record) => record.word));
    const missing = [...rollupWords].filter((word) => !sheetWords.has(word));
    const extra = [...sheetWords].filter((word) => !rollupWords.has(word));
    if (records.length !== sheetWords.size || missing.length > 0 || extra.length > 0) {
      errors.push(
        frequencyIssue(workbookName, {
          code: 'inconsistent_tier_sheet',
          sheet: sheet.name,
          reason: `Tier sheet "${sheet.name}" lists ${sheetWords.size} words but Class ${tier} has ${rollupWords.size} in "${SPONSOR_FREQUENCY_SHEET}" (missing ${missing.length}, extra ${extra.length}).`,
        }),
      );
      continue;
    }
    const byWord = new Map(records.map((record) => [record.word, record]));
    const conflicts = entries
      .filter((entry) => entry.tier === tier)
      .filter((entry) => {
        const record = byWord.get(normalizeWord(entry.word));
        if (!record) {
          return false;
        }
        return (
          (record.verses !== undefined && record.verses !== entry.verses) ||
          (record.occurrences !== undefined && record.occurrences !== entry.occurrences) ||
          (record.repeatsInVerse !== undefined && record.repeatsInVerse !== entry.repeatsInVerse) ||
          (record.references !== undefined &&
            record.references.join(SPONSOR_REFERENCE_SEPARATOR) !== entry.references.join(SPONSOR_REFERENCE_SEPARATOR))
        );
      });
    if (conflicts.length > 0) {
      errors.push(
        frequencyIssue(workbookName, {
          code: 'inconsistent_tier_sheet',
          sheet: sheet.name,
          row: conflicts[0]?.sourceRow,
          field: 'Word',
          reason: `Tier sheet "${sheet.name}" disagrees with "${SPONSOR_FREQUENCY_SHEET}" for ${conflicts.length} word(s), including "${conflicts[0]?.word ?? ''}".`,
        }),
      );
    }
  }

  for (const [tier, found] of tierSheetsByNumber) {
    if (!rollupByTier.has(tier)) {
      errors.push(
        frequencyIssue(workbookName, {
          code: 'unexpected_tier_sheet',
          sheet: found.sheet.name,
          reason: `Tier sheet "${found.sheet.name}" has no Class ${tier} words in "${SPONSOR_FREQUENCY_SHEET}".`,
        }),
      );
    }
  }

  return errors;
}

interface TierSheetRecord {
  readonly word: string;
  readonly verses?: number | null;
  readonly occurrences?: number | null;
  readonly repeatsInVerse?: boolean | null;
  readonly references?: readonly string[];
}

function tierRowIsPopulated(row: ExcelJS.Row): boolean {
  let populated = false;
  row.eachCell({ includeEmpty: false }, (cell) => {
    if (!populated && interpretSponsorCell(cell.value).status !== 'blank') {
      populated = true;
    }
  });
  return populated;
}

function tierSheetWordIssue(
  workbookName: string,
  sheetName: string,
  rowNumber: number,
  word: SponsorInterpretedCell,
): ValidationIssue | undefined {
  if (word.status === 'blank') {
    return frequencyIssue(workbookName, {
      code: 'missing_word',
      sheet: sheetName,
      row: rowNumber,
      field: 'Word',
      reason: 'Word is required.',
    });
  }
  if (word.status !== 'text') {
    return frequencyIssue(workbookName, {
      code: 'unexpected_cell_type',
      sheet: sheetName,
      row: rowNumber,
      field: 'Word',
      reason: 'Word must be text.',
    });
  }
  if (word.text.trim().length === 0) {
    return frequencyIssue(workbookName, {
      code: 'invalid_word',
      sheet: sheetName,
      row: rowNumber,
      field: 'Word',
      reason: 'Word must not be blank.',
    });
  }
  return undefined;
}

function readTierSheetRecords(
  sheet: ExcelJS.Worksheet,
  workbookName: string,
): { records: TierSheetRecord[]; errors: ValidationIssue[] } {
  const errors: ValidationIssue[] = [];
  const headers = new Map<string, number>();
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const interpreted = interpretSponsorCell(cell.value);
    if (interpreted.status === 'text' && interpreted.text.trim().length > 0) {
      headers.set(interpreted.text.trim(), colNumber);
    }
  });
  const wordColumn = headers.get('Word');
  const records: TierSheetRecord[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (!tierRowIsPopulated(row)) {
      continue;
    }
    const word =
      wordColumn === undefined
        ? { status: 'blank' as const }
        : interpretSponsorCell(row.getCell(wordColumn).value);
    const wordIssue = tierSheetWordIssue(workbookName, sheet.name, rowNumber, word);
    if (wordIssue) {
      errors.push(wordIssue);
      continue;
    }
    if (word.status !== 'text') {
      continue;
    }
    const record: {
      word: string;
      verses?: number | null;
      occurrences?: number | null;
      repeatsInVerse?: boolean | null;
      references?: readonly string[];
    } = { word: normalizeWord(word.text) };
    const versesColumn = headers.get('Verses');
    if (versesColumn !== undefined) {
      record.verses = readPositiveInteger(interpretSponsorCell(row.getCell(versesColumn).value)) ?? null;
    }
    const occurrencesColumn = headers.get('Occurrences');
    if (occurrencesColumn !== undefined) {
      record.occurrences = readPositiveInteger(interpretSponsorCell(row.getCell(occurrencesColumn).value)) ?? null;
    }
    const repeatsColumn = headers.get('Repeats In Verse');
    if (repeatsColumn !== undefined) {
      const repeats = interpretSponsorCell(row.getCell(repeatsColumn).value);
      if (repeats.status === 'blank') {
        record.repeatsInVerse = false;
      } else if (repeats.status === 'text' && repeats.text.trim() === SPONSOR_REPEATS_IN_VERSE_FLAG) {
        record.repeatsInVerse = true;
      } else {
        record.repeatsInVerse = null;
      }
    }
    const referencesColumn = headers.get('References');
    if (referencesColumn !== undefined) {
      const references = interpretSponsorCell(row.getCell(referencesColumn).value);
      record.references =
        references.status === 'text'
          ? references.text.split(SPONSOR_REFERENCE_SEPARATOR).map((part) => part.trim())
          : [];
    }
    records.push(record);
  }
  return { records, errors };
}

/**
 * Reads `All Frequency Words` from a workbook already in memory. `All Frequency
 * Words` is the authoritative table; tier sheets (`1x Words`, `2x Words`, …) are
 * consistency checks only, and a missing higher tier is valid when the rollup
 * has no words of that Class. Duplicate worksheets for one tier are rejected.
 * A completely empty tier-sheet row is ignored; a populated row with a missing
 * or invalid Word fails closed. Fails closed with workbook, sheet, row, field,
 * and reason on any ambiguous or inconsistent source.
 */
export function readSponsorFrequencyWords(
  workbook: ExcelJS.Workbook,
  workbookName: string,
): SponsorFrequencyWordsResult {
  const sheet = workbook.getWorksheet(SPONSOR_FREQUENCY_SHEET);
  if (!sheet) {
    return {
      ok: false,
      errors: [
        frequencyIssue(workbookName, {
          code: 'missing_sheet',
          reason: `Required sheet "${SPONSOR_FREQUENCY_SHEET}" is missing.`,
        }),
      ],
    };
  }

  const header = readHeaderColumns(sheet.getRow(1), workbookName);
  if (header.errors.length > 0) {
    return { ok: false, errors: header.errors };
  }

  const entries: SponsorFrequencyEntry[] = [];
  const errors: ValidationIssue[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const isBlank = SPONSOR_FREQUENCY_COLUMNS.every(
      (column) => cellAt(row, header.columns, column).status === 'blank',
    );
    if (isBlank) {
      continue;
    }
    const parsed = parseRow(row, rowNumber, header.columns, workbookName);
    errors.push(...parsed.issues);
    if (parsed.entry) {
      entries.push(parsed.entry);
    }
  }

  if (entries.length === 0 && errors.length === 0) {
    errors.push(
      frequencyIssue(workbookName, {
        code: 'empty_frequency_words',
        reason: `"${SPONSOR_FREQUENCY_SHEET}" must contain at least one frequency word.`,
      }),
    );
  }

  errors.push(...crossRowIssues(entries, workbookName));
  errors.push(...tierSheetIssues(workbook, entries, workbookName));

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    frequencyWords: {
      workbookName,
      sheetName: SPONSOR_FREQUENCY_SHEET,
      entries,
    },
  };
}
