/**
 * Independent sponsor-annotation audit.
 *
 * Reads official workbook cells and locates spans without the production word
 * matcher or the generator's sourceTarget. Production output is the thing
 * under test, not the oracle.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { buildOfficialSponsorDraft } from '../scripts/content-pipeline/buildOfficialSponsorDraft';
import {
  deriveAnnotationId,
  targetingPayloadForPhraseOccurrence,
} from '../scripts/content-pipeline/identifiers';
import { resolveAnnotationTarget } from '../scripts/content-pipeline/resolveAnnotationTarget';
import { WPFBQ_2027_SPONSOR_PROFILE } from '../scripts/content-pipeline/sponsorSourceProfile';
import type { ContentAnnotationRecord, ContentCardRecord } from '../scripts/content-pipeline/types';

const LOCAL_DIR = path.join(process.cwd(), 'content/authoring/local');
const REFERENCE_SEPARATOR = ' \u00b7 ';
const CONFIRMED_SEASON_DATES = { startDate: '2027-01-01', endDate: '2027-08-31' } as const;
const WORKBOOK_SHA256: Readonly<Record<string, string>> = {
  'WPFBQ_2027_Cadet_Data_Workbook.xlsx':
    '4df71ca79b5bf4e659d73be648fe6e4e6d91a85317364968ddf7c6b3b36d13cd',
  'WPFBQ_2027_Beginner_Data_Workbook.xlsx':
    '4515cf815ca3ba38fd2ce4ccec7064d7a3c42ff540d17b3a153e3178130ccee7',
  'WPFBQ_2027_Junior_Data_Workbook.xlsx':
    'cbf797e220e2a92f2904cd499365ef7d499057696b6dfeedf3c10fa1578e81ac',
  'WPFBQ_2027_Senior_Data_Workbook.xlsx':
    '856d02dfeb7c095e57cd79618875dd83a7a51aac06209097fce973786b05af27',
};

const VERSE_FIELDS = [
  'Seq',
  'Section',
  'Battlefield',
  'Topic',
  'Question',
  'Reference',
  'Book',
  'Ch',
  'V',
  'Unique Beginning',
  'Unique Ending',
  'Verse Text',
] as const;

const FREQUENCY_FIELDS = [
  'Class',
  'Word',
  'Verses',
  'Occurrences',
  'Repeats In Verse',
  'References',
] as const;

export interface AuditDiscrepancy {
  readonly workbook: string;
  readonly kind: string;
  readonly detail: string;
}

export interface RepeatedEndingCase {
  readonly reference: string;
  readonly phrase: string;
  readonly occurrenceIndex: number;
  readonly matchCount: number;
}

export interface WorkbookAuditStats {
  readonly workbook: string;
  readonly sha256: string;
  readonly sheetNames: readonly string[];
  readonly summaryLines: readonly string[];
  readonly verseRows: number;
  readonly uniqueBeginnings: number;
  readonly uniqueEndings: number;
  readonly blankBeginnings: number;
  readonly blankEndings: number;
  readonly leadingPunctuationVerses: number;
  readonly beginningsThatIncludeLeadingPunctuation: number;
  readonly leadingPunctuationExamples: readonly string[];
  readonly repeatedEndings: readonly RepeatedEndingCase[];
  readonly frequencyEntries: number;
  readonly frequencyOccurrences: number;
  readonly frequencyByTier: Readonly<Record<number, { entries: number; occurrences: number }>>;
  readonly tierSheets: readonly { name: string; words: number; headers: readonly string[] }[];
  readonly characterCounts: Readonly<Record<string, number>>;
}

export interface MaterialSetAnnotationCounts {
  readonly materialSetId: string;
  readonly cards: number;
  readonly uniqueBeginning: number;
  readonly uniqueEnding: number;
  readonly frequency: number;
  readonly total: number;
  readonly frequencyByTier: Readonly<Record<number, number>>;
}

export interface IndependentSponsorAuditReport {
  readonly discrepancyCount: number;
  readonly discrepancies: readonly AuditDiscrepancy[];
  readonly stats: readonly WorkbookAuditStats[];
  readonly materialSets: readonly MaterialSetAnnotationCounts[];
  readonly totalGenerated: number;
}

interface Span {
  readonly start: number;
  readonly end: number;
}

interface Token extends Span {
  readonly text: string;
  readonly normalized: string;
}

interface RawVerse {
  readonly sourceRow: number;
  readonly seq: number;
  readonly section: string;
  readonly battlefield?: string | number;
  readonly topic?: string;
  readonly question?: string;
  readonly reference: string;
  readonly book?: string;
  readonly ch?: number;
  readonly v?: number;
  readonly uniqueBeginning?: string;
  readonly uniqueEnding?: string;
  readonly verseText: string;
  readonly tokens: readonly Token[];
}

interface RawFrequency {
  readonly sourceRow: number;
  readonly word: string;
  readonly tier: number;
  readonly verses: number;
  readonly occurrences: number;
  readonly repeatsInVerse: boolean;
  readonly references: readonly string[];
  readonly rawReferences: string;
}

interface ExpectedAnnotation {
  readonly type: 'uniqueBeginning' | 'uniqueEnding' | 'frequency';
  readonly phrase: string;
  readonly occurrenceIndex: number;
  readonly start: number;
  readonly end: number;
  readonly frequencyTier?: number;
}

type ReadCell =
  | { readonly kind: 'blank' }
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'number'; readonly value: number }
  | { readonly kind: 'invalid'; readonly reason: string };

function readCell(value: ExcelJS.CellValue | null | undefined): ReadCell {
  if (value === null || value === undefined || value === '') {
    return { kind: 'blank' };
  }
  if (typeof value === 'string') {
    return { kind: 'text', text: value };
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? { kind: 'number', value } : { kind: 'invalid', reason: 'non-finite number' };
  }
  if (typeof value === 'boolean' || value instanceof Date) {
    return { kind: 'invalid', reason: 'unsupported cell type' };
  }
  if (typeof value === 'object' && value && 'richText' in value && Array.isArray(value.richText)) {
    let text = '';
    for (const part of value.richText) {
      if (typeof part?.text !== 'string') {
        return { kind: 'invalid', reason: 'rich text part is not text' };
      }
      text += part.text;
    }
    return text.length === 0 ? { kind: 'blank' } : { kind: 'text', text };
  }
  if (typeof value === 'object' && value && 'result' in value) {
    return readCell(value.result as ExcelJS.CellValue);
  }
  return { kind: 'invalid', reason: 'unsupported cell object' };
}

function headerColumns(row: ExcelJS.Row): Map<string, number> {
  const headers = new Map<string, number>();
  row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const read = readCell(cell.value);
    if (read.kind === 'text' && read.text.trim().length > 0) {
      headers.set(read.text.trim(), colNumber);
    }
  });
  return headers;
}

function cellAt(row: ExcelJS.Row, headers: ReadonlyMap<string, number>, name: string): ReadCell {
  const colNumber = headers.get(name);
  if (colNumber === undefined) {
    return { kind: 'blank' };
  }
  return readCell(row.getCell(colNumber).value);
}

function isLetterOrNumber(char: string): boolean {
  return /[\p{L}\p{N}]/u.test(char);
}

function continuesWord(char: string): boolean {
  return isLetterOrNumber(char) || /\p{M}/u.test(char) || char === "'" || char === '\u2019' || char === '\u02bc' || char === '-';
}

function normalizeWord(value: string): string {
  return value.replace(/[\u2019\u02bc]/g, "'").toLowerCase();
}

function codeUnits(value: string): Array<{ char: string; start: number; end: number }> {
  const units: Array<{ char: string; start: number; end: number }> = [];
  for (let index = 0; index < value.length; ) {
    const codePoint = value.codePointAt(index);
    if (codePoint === undefined) {
      break;
    }
    const char = String.fromCodePoint(codePoint);
    units.push({ char, start: index, end: index + char.length });
    index += char.length;
  }
  return units;
}

/** Whole words by an independent scan. Spans index the original verse. */
function tokenize(verse: string): Token[] {
  const units = codeUnits(verse);
  const tokens: Token[] = [];
  let index = 0;
  while (index < units.length) {
    const unit = units[index];
    if (!unit || !isLetterOrNumber(unit.char)) {
      index += 1;
      continue;
    }
    const start = unit.start;
    let endIndex = index + 1;
    while (endIndex < units.length && continuesWord(units[endIndex]?.char ?? '')) {
      endIndex += 1;
    }
    const end = units[endIndex - 1]?.end ?? start;
    const text = verse.slice(start, end);
    tokens.push({ start, end, text, normalized: normalizeWord(text) });
    index = endIndex;
  }
  return tokens;
}

function punctuationOnly(value: string): boolean {
  return codeUnits(value).every((unit) => !isLetterOrNumber(unit.char));
}

function exactSpans(verse: string, phrase: string): Span[] {
  if (phrase.length === 0) {
    return [];
  }
  const spans: Span[] = [];
  let from = 0;
  while (from <= verse.length - phrase.length) {
    const start = verse.indexOf(phrase, from);
    if (start === -1) {
      break;
    }
    spans.push({ start, end: start + phrase.length });
    from = start + phrase.length;
  }
  return spans;
}

function positiveInteger(cell: ReadCell): number | undefined {
  if (cell.kind === 'number' && Number.isSafeInteger(cell.value) && cell.value >= 1) {
    return cell.value;
  }
  if (cell.kind === 'text' && /^[1-9]\d*$/.test(cell.text.trim())) {
    return Number.parseInt(cell.text.trim(), 10);
  }
  return undefined;
}

function pushDiscrepancy(target: AuditDiscrepancy[], item: AuditDiscrepancy): void {
  target.push(item);
}

function identityKey(annotation: ExpectedAnnotation): string {
  return [
    annotation.type,
    annotation.phrase,
    String(annotation.occurrenceIndex),
    annotation.frequencyTier === undefined ? '' : String(annotation.frequencyTier),
    String(annotation.start),
    String(annotation.end),
  ].join('\u001f');
}

function packageKey(verseText: string, annotation: ContentAnnotationRecord): string {
  return [
    annotation.type,
    annotation.sourceTarget.phrase,
    String(annotation.sourceTarget.occurrenceIndex),
    annotation.frequencyTier === undefined ? '' : String(annotation.frequencyTier),
    String(annotation.resolvedTarget.start),
    String(annotation.resolvedTarget.end),
    verseText.slice(annotation.resolvedTarget.start, annotation.resolvedTarget.end),
  ].join('\u001f');
}

function countCharacter(counts: Record<string, number>, value: string): void {
  for (const unit of codeUnits(value)) {
    if (unit.char.codePointAt(0)! > 127 || unit.char === '(' || unit.char === ')' || unit.char === '"') {
      const label = `U+${unit.char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`;
      counts[label] = (counts[label] ?? 0) + 1;
    }
  }
}

interface RawWorkbook {
  readonly fileName: string;
  readonly sha256: string;
  readonly sheetNames: readonly string[];
  readonly summaryLines: readonly string[];
  readonly verses: readonly RawVerse[];
  readonly frequency: readonly RawFrequency[];
  readonly tierSheets: readonly { name: string; words: readonly string[]; headers: readonly string[]; rows: readonly TierSheetRow[] }[];
  readonly characterCounts: Readonly<Record<string, number>>;
}

function readVerses(
  workbook: ExcelJS.Workbook,
  fileName: string,
  discrepancies: AuditDiscrepancy[],
): RawVerse[] {
  const sheet = workbook.getWorksheet('Verse List');
  if (!sheet) {
    pushDiscrepancy(discrepancies, { workbook: fileName, kind: 'missing_sheet', detail: 'Verse List' });
    return [];
  }
  const headers = headerColumns(sheet.getRow(1));
  for (const field of VERSE_FIELDS) {
    if (!headers.has(field)) {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'missing_header',
        detail: `Verse List is missing ${field}.`,
      });
    }
  }
  const verses: RawVerse[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const seq = positiveInteger(cellAt(row, headers, 'Seq'));
    const referenceCell = cellAt(row, headers, 'Reference');
    const verseCell = cellAt(row, headers, 'Verse Text');
    if (seq === undefined && referenceCell.kind === 'blank' && verseCell.kind === 'blank') {
      continue;
    }
    if (referenceCell.kind !== 'text' || verseCell.kind !== 'text' || seq === undefined) {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'verse_cell',
        detail: `Row ${rowNumber} does not have a text reference, text verse, and positive Seq.`,
      });
      continue;
    }
    const sectionCell = cellAt(row, headers, 'Section');
    const beginningCell = cellAt(row, headers, 'Unique Beginning');
    const endingCell = cellAt(row, headers, 'Unique Ending');
    const topicCell = cellAt(row, headers, 'Topic');
    const questionCell = cellAt(row, headers, 'Question');
    const bookCell = cellAt(row, headers, 'Book');
    const battlefieldCell = cellAt(row, headers, 'Battlefield');
    if (beginningCell.kind === 'invalid' || endingCell.kind === 'invalid' || sectionCell.kind !== 'text') {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'verse_cell',
        detail: `Row ${rowNumber} has an unreadable section or unique phrase.`,
      });
    }
    const battlefield =
      battlefieldCell.kind === 'number'
        ? battlefieldCell.value
        : battlefieldCell.kind === 'text'
          ? battlefieldCell.text
          : undefined;
    verses.push({
      sourceRow: rowNumber,
      seq,
      section: sectionCell.kind === 'text' ? sectionCell.text : '',
      ...(battlefield === undefined ? {} : { battlefield }),
      ...(topicCell.kind === 'text' ? { topic: topicCell.text } : {}),
      ...(questionCell.kind === 'text' ? { question: questionCell.text } : {}),
      reference: referenceCell.text,
      ...(bookCell.kind === 'text' ? { book: bookCell.text } : {}),
      ...(positiveInteger(cellAt(row, headers, 'Ch')) === undefined
        ? {}
        : { ch: positiveInteger(cellAt(row, headers, 'Ch')) }),
      ...(positiveInteger(cellAt(row, headers, 'V')) === undefined
        ? {}
        : { v: positiveInteger(cellAt(row, headers, 'V')) }),
      ...(beginningCell.kind === 'text' ? { uniqueBeginning: beginningCell.text } : {}),
      ...(endingCell.kind === 'text' ? { uniqueEnding: endingCell.text } : {}),
      verseText: verseCell.text,
      tokens: tokenize(verseCell.text),
    });
  }
  return verses;
}

function readFrequency(
  workbook: ExcelJS.Workbook,
  fileName: string,
  discrepancies: AuditDiscrepancy[],
): RawFrequency[] {
  const sheet = workbook.getWorksheet('All Frequency Words');
  if (!sheet) {
    pushDiscrepancy(discrepancies, { workbook: fileName, kind: 'missing_sheet', detail: 'All Frequency Words' });
    return [];
  }
  const headers = headerColumns(sheet.getRow(1));
  for (const field of FREQUENCY_FIELDS) {
    if (!headers.has(field)) {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'missing_header',
        detail: `All Frequency Words is missing ${field}.`,
      });
    }
  }
  const entries: RawFrequency[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const wordCell = cellAt(row, headers, 'Word');
    const classCell = cellAt(row, headers, 'Class');
    const referencesCell = cellAt(row, headers, 'References');
    if (wordCell.kind === 'blank' && classCell.kind === 'blank' && referencesCell.kind === 'blank') {
      continue;
    }
    if (wordCell.kind !== 'text' || referencesCell.kind !== 'text') {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'frequency_cell',
        detail: `Row ${rowNumber} Word or References is not text.`,
      });
      continue;
    }
    const tier = positiveInteger(classCell);
    const verses = positiveInteger(cellAt(row, headers, 'Verses'));
    const occurrences = positiveInteger(cellAt(row, headers, 'Occurrences'));
    const repeatsCell = cellAt(row, headers, 'Repeats In Verse');
    const repeatsInVerse = repeatsCell.kind === 'text' && repeatsCell.text.trim() === 'YES';
    if (repeatsCell.kind !== 'blank' && !repeatsInVerse) {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'repeats_flag',
        detail: `Row ${rowNumber} Repeats In Verse is not blank or YES.`,
      });
    }
    const rawReferences = referencesCell.text;
    if (rawReferences.split(REFERENCE_SEPARATOR).join('').includes('\u00b7')) {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'reference_separator',
        detail: `Row ${rowNumber} contains a middle dot outside the separator.`,
      });
    }
    const references = rawReferences.split(REFERENCE_SEPARATOR).map((part) => part.trim());
    if (references.join(REFERENCE_SEPARATOR) !== rawReferences.trim()) {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'reference_separator',
        detail: `Row ${rowNumber} references do not round-trip through the middle-dot separator.`,
      });
    }
    if (tier === undefined || verses === undefined || occurrences === undefined) {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'frequency_cell',
        detail: `Row ${rowNumber} is missing Class, Verses, or Occurrences.`,
      });
      continue;
    }
    entries.push({
      sourceRow: rowNumber,
      word: wordCell.text,
      tier,
      verses,
      occurrences,
      repeatsInVerse,
      references,
      rawReferences,
    });
  }
  return entries;
}

interface TierSheetRow {
  readonly word: string;
  readonly verses?: number;
  readonly occurrences?: number;
  readonly repeatsInVerse?: boolean;
  readonly references?: string;
}

function readTierSheets(
  workbook: ExcelJS.Workbook,
): Array<{ name: string; words: string[]; headers: string[]; rows: TierSheetRow[] }> {
  const sheets: Array<{ name: string; words: string[]; headers: string[]; rows: TierSheetRow[] }> = [];
  for (const sheet of workbook.worksheets) {
    if (!/^(\d+)x Words\b/.test(sheet.name)) {
      continue;
    }
    const headers = headerColumns(sheet.getRow(1));
    const headerNames = [...headers.keys()];
    const wordColumn = headers.get('Word');
    const words: string[] = [];
    const rows: TierSheetRow[] = [];
    if (wordColumn !== undefined) {
      for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
        const row = sheet.getRow(rowNumber);
        const read = readCell(row.getCell(wordColumn).value);
        if (read.kind !== 'text' || read.text.trim().length === 0) {
          continue;
        }
        words.push(read.text);
        const versesColumn = headers.get('Verses');
        const occurrencesColumn = headers.get('Occurrences');
        const repeatsColumn = headers.get('Repeats In Verse');
        const referencesColumn = headers.get('References');
        const repeats = repeatsColumn === undefined ? undefined : readCell(row.getCell(repeatsColumn).value);
        const references = referencesColumn === undefined ? undefined : readCell(row.getCell(referencesColumn).value);
        rows.push({
          word: read.text,
          ...(versesColumn === undefined ? {} : { verses: positiveInteger(readCell(row.getCell(versesColumn).value)) }),
          ...(occurrencesColumn === undefined
            ? {}
            : { occurrences: positiveInteger(readCell(row.getCell(occurrencesColumn).value)) }),
          ...(repeats === undefined ? {} : { repeatsInVerse: repeats.kind === 'text' && repeats.text.trim() === 'YES' }),
          ...(references?.kind === 'text' ? { references: references.text } : {}),
        });
      }
    }
    sheets.push({ name: sheet.name, words, headers: headerNames, rows });
  }
  return sheets;
}

function checkTierSheets(
  fileName: string,
  frequency: readonly RawFrequency[],
  tierSheets: readonly { name: string; words: readonly string[]; headers: readonly string[]; rows: readonly TierSheetRow[] }[],
  discrepancies: AuditDiscrepancy[],
): void {
  const byTier = new Map<number, RawFrequency[]>();
  for (const entry of frequency) {
    const list = byTier.get(entry.tier) ?? [];
    list.push(entry);
    byTier.set(entry.tier, list);
  }
  const sheetsByTier = new Map<number, { name: string; words: readonly string[]; headers: readonly string[]; rows: readonly TierSheetRow[] }>();
  for (const sheet of tierSheets) {
    const match = /^(\d+)x Words\b/.exec(sheet.name);
    const tier = Number.parseInt(match?.[1] ?? '', 10);
    if (sheetsByTier.has(tier)) {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'duplicate_tier_sheet',
        detail: sheet.name,
      });
    }
    sheetsByTier.set(tier, sheet);
  }
  for (let tier = 1; tier <= 5; tier += 1) {
    const entries = byTier.get(tier) ?? [];
    const sheet = sheetsByTier.get(tier);
    if (entries.length === 0) {
      if (sheet) {
        pushDiscrepancy(discrepancies, {
          workbook: fileName,
          kind: 'unexpected_tier_sheet',
          detail: `${sheet.name} has no Class ${tier} rows.`,
        });
      }
      continue;
    }
    if (!sheet) {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'missing_tier_sheet',
        detail: `Class ${tier} has ${entries.length} rows and no tier sheet.`,
      });
      continue;
    }
    const expected = new Set(entries.map((entry) => normalizeWord(entry.word)));
    const actual = new Set(sheet.words.map((word) => normalizeWord(word)));
    const missing = [...expected].filter((word) => !actual.has(word));
    const extra = [...actual].filter((word) => !expected.has(word));
    if (missing.length > 0 || extra.length > 0) {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'tier_sheet_words',
        detail: `${sheet.name} missing ${missing.length}, extra ${extra.length}.`,
      });
    }
    const rowsByWord = new Map<string, TierSheetRow[]>();
    for (const row of sheet.rows) {
      const key = normalizeWord(row.word);
      const list = rowsByWord.get(key) ?? [];
      list.push(row);
      rowsByWord.set(key, list);
    }
    for (const entry of entries) {
      const rows = rowsByWord.get(normalizeWord(entry.word)) ?? [];
      const row = rows[0];
      if (!row || rows.length !== 1) {
        continue;
      }
      if (
        (row.verses !== undefined && row.verses !== entry.verses) ||
        (row.occurrences !== undefined && row.occurrences !== entry.occurrences) ||
        (row.repeatsInVerse !== undefined && row.repeatsInVerse !== entry.repeatsInVerse) ||
        (row.references !== undefined && row.references.trim() !== entry.rawReferences.trim())
      ) {
        pushDiscrepancy(discrepancies, {
          workbook: fileName,
          kind: 'tier_sheet_values',
          detail: `${sheet.name} "${entry.word}" disagrees with All Frequency Words row ${entry.sourceRow}.`,
        });
      }
    }
  }
}

function checkFrequencyRows(
  fileName: string,
  verses: readonly RawVerse[],
  frequency: readonly RawFrequency[],
  discrepancies: AuditDiscrepancy[],
): void {
  const cardsByReference = new Map<string, RawVerse[]>();
  for (const verse of verses) {
    const list = cardsByReference.get(verse.reference) ?? [];
    list.push(verse);
    cardsByReference.set(verse.reference, list);
  }
  const seenWords = new Map<string, number>();
  for (const entry of frequency) {
    const normalized = normalizeWord(entry.word);
    const previous = seenWords.get(normalized);
    if (previous !== undefined) {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'duplicate_frequency_word',
        detail: `Row ${entry.sourceRow} "${entry.word}" repeats row ${previous}.`,
      });
    } else {
      seenWords.set(normalized, entry.sourceRow);
    }
    if (entry.tier < 1 || entry.tier > 5 || entry.tier !== entry.verses || entry.references.length !== entry.verses) {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'frequency_class',
        detail: `Row ${entry.sourceRow} "${entry.word}" class ${entry.tier}, verses ${entry.verses}, references ${entry.references.length}.`,
      });
    }
    if (new Set(entry.references).size !== entry.references.length) {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'duplicate_reference',
        detail: `Row ${entry.sourceRow} "${entry.word}" repeats a reference.`,
      });
    }
    let hits = 0;
    let repeatedVerse = false;
    for (const reference of entry.references) {
      const cards = cardsByReference.get(reference) ?? [];
      if (cards.length !== 1) {
        pushDiscrepancy(discrepancies, {
          workbook: fileName,
          kind: 'frequency_reference',
          detail: `Row ${entry.sourceRow} "${entry.word}" reference "${reference}" matches ${cards.length} cards.`,
        });
        continue;
      }
      const card = cards[0];
      if (!card) {
        continue;
      }
      const tokenHits = card.tokens.filter((token) => token.normalized === normalized);
      if (tokenHits.length === 0) {
        pushDiscrepancy(discrepancies, {
          workbook: fileName,
          kind: 'frequency_not_in_verse',
          detail: `Row ${entry.sourceRow} "${entry.word}" has no whole-word hit in ${reference}.`,
        });
      }
      if (tokenHits.length > 1) {
        repeatedVerse = true;
      }
      hits += tokenHits.length;
    }
    if (hits !== entry.occurrences) {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'frequency_occurrences',
        detail: `Row ${entry.sourceRow} "${entry.word}" scripture hits ${hits}, source Occurrences ${entry.occurrences}.`,
      });
    }
    if (repeatedVerse !== entry.repeatsInVerse || (entry.occurrences > entry.verses) !== entry.repeatsInVerse) {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'repeats_flag',
        detail: `Row ${entry.sourceRow} "${entry.word}" repeats flag ${entry.repeatsInVerse} disagrees with scripture.`,
      });
    }
  }
}

function expectedForVerse(
  fileName: string,
  verse: RawVerse,
  discrepancies: AuditDiscrepancy[],
): ExpectedAnnotation[] {
  const expected: ExpectedAnnotation[] = [];
  if (verse.uniqueBeginning) {
    const matches = exactSpans(verse.verseText, verse.uniqueBeginning);
    const span = matches[0];
    if (matches.length !== 1 || !span || !punctuationOnly(verse.verseText.slice(0, span.start))) {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'unique_beginning',
        detail: `${verse.reference} "${verse.uniqueBeginning}" has ${matches.length} exact hits.`,
      });
    } else if (verse.verseText.slice(span.start, span.end) === verse.uniqueBeginning) {
      expected.push({
        type: 'uniqueBeginning',
        phrase: verse.uniqueBeginning,
        occurrenceIndex: 1,
        start: span.start,
        end: span.end,
      });
    }
  }
  if (verse.uniqueEnding) {
    const matches = exactSpans(verse.verseText, verse.uniqueEnding);
    const suffix = matches.filter((span) => punctuationOnly(verse.verseText.slice(span.end)));
    const span = suffix[0];
    const occurrenceIndex = span ? matches.findIndex((match) => match.start === span.start) + 1 : 0;
    const later = span ? matches.some((match) => match.start > span.start) : false;
    if (matches.length === 0 || suffix.length !== 1 || !span || occurrenceIndex < 1 || later) {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'unique_ending',
        detail: `${verse.reference} "${verse.uniqueEnding}" has ${matches.length} hits and ${suffix.length} suffix hits.`,
      });
    } else if (verse.verseText.slice(span.start, span.end) === verse.uniqueEnding) {
      expected.push({
        type: 'uniqueEnding',
        phrase: verse.uniqueEnding,
        occurrenceIndex,
        start: span.start,
        end: span.end,
      });
    }
  }
  return expected;
}

function expectedFrequency(
  fileName: string,
  verses: readonly RawVerse[],
  frequency: readonly RawFrequency[],
  discrepancies: AuditDiscrepancy[],
): Map<number, ExpectedAnnotation[]> {
  const bySeq = new Map(verses.map((verse) => [verse.reference, verse]));
  const annotations = new Map<number, ExpectedAnnotation[]>();
  for (const verse of verses) {
    annotations.set(verse.seq, []);
  }
  for (const entry of frequency) {
    const normalized = normalizeWord(entry.word);
    for (const reference of entry.references) {
      const verse = bySeq.get(reference);
      if (!verse) {
        continue;
      }
      const hits = verse.tokens.filter((token) => token.normalized === normalized);
      for (const token of hits) {
        const matches = exactSpans(verse.verseText, token.text);
        const occurrenceIndex = matches.findIndex((span) => span.start === token.start && span.end === token.end) + 1;
        if (occurrenceIndex < 1 || verse.verseText.slice(token.start, token.end) !== token.text) {
          pushDiscrepancy(discrepancies, {
            workbook: fileName,
            kind: 'frequency_span',
            detail: `${reference} "${entry.word}" token "${token.text}" is not an exact phrase occurrence.`,
          });
          continue;
        }
        const list = annotations.get(verse.seq) ?? [];
        list.push({
          type: 'frequency',
          phrase: token.text,
          occurrenceIndex,
          start: token.start,
          end: token.end,
          frequencyTier: entry.tier,
        });
        annotations.set(verse.seq, list);
      }
    }
  }
  return annotations;
}

function compareCard(
  fileName: string,
  materialSetId: string,
  verse: RawVerse,
  card: ContentCardRecord,
  expected: readonly ExpectedAnnotation[],
  discrepancies: AuditDiscrepancy[],
): void {
  const label = `${materialSetId} ${verse.reference}`;
  if (card.cardNumber !== verse.seq || card.cardId !== `c${verse.seq}`) {
    pushDiscrepancy(discrepancies, { workbook: fileName, kind: 'card_identity', detail: label });
  }
  if (card.reference !== verse.reference || card.verseText !== verse.verseText) {
    pushDiscrepancy(discrepancies, { workbook: fileName, kind: 'scripture', detail: label });
  }
  if (card.quizMetadata !== undefined) {
    pushDiscrepancy(discrepancies, { workbook: fileName, kind: 'quiz_metadata', detail: label });
  }
  const context = card.studyContext;
  if (context?.battlefield !== verse.battlefield || context?.topic !== verse.topic || context?.thematicQuestion !== verse.question) {
    pushDiscrepancy(discrepancies, { workbook: fileName, kind: 'study_context', detail: label });
  }
  const actualKeys = card.annotations.map((annotation) => {
    const resolved = resolveAnnotationTarget({
      verseText: card.verseText,
      sourceTarget: annotation.sourceTarget,
    });
    const id = deriveAnnotationId({
      cardId: card.cardId,
      type: annotation.type,
      strategy: annotation.sourceTarget.strategy,
      targetingPayload: targetingPayloadForPhraseOccurrence(
        annotation.sourceTarget.phrase,
        annotation.sourceTarget.occurrenceIndex,
      ),
    });
    if (
      resolved.error ||
      resolved.resolved?.start !== annotation.resolvedTarget.start ||
      resolved.resolved.end !== annotation.resolvedTarget.end ||
      card.verseText.slice(annotation.resolvedTarget.start, annotation.resolvedTarget.end) !== annotation.sourceTarget.phrase ||
      annotation.annotationId !== id ||
      annotation.cardId !== card.cardId
    ) {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'annotation_resolution',
        detail: `${label} ${annotation.type} "${annotation.sourceTarget.phrase}"`,
      });
    }
    if (annotation.type === 'frequency' && (annotation.frequencyTier === undefined || annotation.notes !== undefined)) {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'frequency_metadata',
        detail: `${label} tier ${String(annotation.frequencyTier)}`,
      });
    }
    if (annotation.type !== 'frequency' && annotation.frequencyTier !== undefined) {
      pushDiscrepancy(discrepancies, { workbook: fileName, kind: 'frequency_metadata', detail: label });
    }
    return packageKey(card.verseText, annotation).split('\u001f').slice(0, 6).join('\u001f');
  });
  const expectedKeys = expected.map((annotation) => identityKey(annotation));
  const expectedCounts = new Map<string, number>();
  for (const key of expectedKeys) {
    expectedCounts.set(key, (expectedCounts.get(key) ?? 0) + 1);
  }
  const actualCounts = new Map<string, number>();
  for (const key of actualKeys) {
    actualCounts.set(key, (actualCounts.get(key) ?? 0) + 1);
  }
  for (const [key, count] of expectedCounts) {
    if (actualCounts.get(key) !== count) {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'annotation_mismatch',
        detail: `${label} expected ${count} of ${key} and found ${actualCounts.get(key) ?? 0}.`,
      });
    }
  }
  for (const [key, count] of actualCounts) {
    if (!expectedCounts.has(key)) {
      pushDiscrepancy(discrepancies, {
        workbook: fileName,
        kind: 'extra_annotation',
        detail: `${label} has ${count} unexpected ${key}.`,
      });
    }
  }
  const ids = card.annotations.map((annotation) => annotation.annotationId);
  if (new Set(ids).size !== ids.length || ids.some((id, index) => index > 0 && ids[index - 1]! > id)) {
    pushDiscrepancy(discrepancies, { workbook: fileName, kind: 'annotation_identity', detail: label });
  }
}

function boundaryStats(verses: readonly RawVerse[]): {
  uniqueBeginnings: number;
  uniqueEndings: number;
  blankBeginnings: number;
  blankEndings: number;
  leadingPunctuationVerses: number;
  beginningsThatIncludeLeadingPunctuation: number;
  leadingPunctuationExamples: string[];
  repeatedEndings: RepeatedEndingCase[];
} {
  const repeatedEndings: RepeatedEndingCase[] = [];
  const leadingPunctuationExamples: string[] = [];
  let uniqueBeginnings = 0;
  let uniqueEndings = 0;
  let blankBeginnings = 0;
  let blankEndings = 0;
  let leadingPunctuationVerses = 0;
  let beginningsThatIncludeLeadingPunctuation = 0;
  for (const verse of verses) {
    if (verse.uniqueBeginning) {
      uniqueBeginnings += 1;
    } else {
      blankBeginnings += 1;
    }
    if (verse.uniqueEnding) {
      uniqueEndings += 1;
      const matches = exactSpans(verse.verseText, verse.uniqueEnding);
      const suffix = matches.filter((span) => punctuationOnly(verse.verseText.slice(span.end)));
      const span = suffix[0];
      const occurrenceIndex = span ? matches.findIndex((match) => match.start === span.start) + 1 : 0;
      if (occurrenceIndex > 1) {
        repeatedEndings.push({
          reference: verse.reference,
          phrase: verse.uniqueEnding,
          occurrenceIndex,
          matchCount: matches.length,
        });
      }
    } else {
      blankEndings += 1;
    }
    const leading = verse.verseText.match(/^[^\p{L}\p{N}]+/u)?.[0] ?? '';
    if (leading.length > 0) {
      leadingPunctuationVerses += 1;
      if (verse.uniqueBeginning?.startsWith(leading)) {
        beginningsThatIncludeLeadingPunctuation += 1;
      }
      if (leadingPunctuationExamples.length < 8) {
        leadingPunctuationExamples.push(
          `${verse.reference} verse "${verse.verseText.slice(0, 24)}" beginning "${verse.uniqueBeginning ?? ''}"`,
        );
      }
    }
  }
  return {
    uniqueBeginnings,
    uniqueEndings,
    blankBeginnings,
    blankEndings,
    leadingPunctuationVerses,
    beginningsThatIncludeLeadingPunctuation,
    leadingPunctuationExamples,
    repeatedEndings,
  };
}

function materialSetCounts(materialSetId: string, cards: readonly ContentCardRecord[]): MaterialSetAnnotationCounts {
  const frequencyByTier: Record<number, number> = {};
  let uniqueBeginning = 0;
  let uniqueEnding = 0;
  let frequency = 0;
  for (const card of cards) {
    for (const annotation of card.annotations) {
      if (annotation.type === 'uniqueBeginning') {
        uniqueBeginning += 1;
      } else if (annotation.type === 'uniqueEnding') {
        uniqueEnding += 1;
      } else if (annotation.type === 'frequency') {
        frequency += 1;
        const tier = annotation.frequencyTier ?? 0;
        frequencyByTier[tier] = (frequencyByTier[tier] ?? 0) + 1;
      }
    }
  }
  return {
    materialSetId,
    cards: cards.length,
    uniqueBeginning,
    uniqueEnding,
    frequency,
    total: uniqueBeginning + uniqueEnding + frequency,
    frequencyByTier,
  };
}

export async function auditOfficialSponsorAnnotations(): Promise<IndependentSponsorAuditReport> {
  const discrepancies: AuditDiscrepancy[] = [];
  const rawWorkbooks: RawWorkbook[] = [];
  for (const source of WPFBQ_2027_SPONSOR_PROFILE.sources) {
    const workbook = new ExcelJS.Workbook();
    const filePath = path.join(LOCAL_DIR, source.fileName);
    const sha256 = createHash('sha256').update(readFileSync(filePath)).digest('hex');
    if (sha256 !== WORKBOOK_SHA256[source.fileName]) {
      pushDiscrepancy(discrepancies, {
        workbook: source.fileName,
        kind: 'workbook_hash',
        detail: sha256,
      });
    }
    await workbook.xlsx.readFile(filePath);
    const sheetNames = workbook.worksheets.map((sheet) => sheet.name);
    const summary = workbook.getWorksheet('Summary');
    const summaryLines: string[] = [];
    summary?.eachRow((row, rowNumber) => {
      if (summaryLines.length >= 20) {
        return;
      }
      const cells: string[] = [];
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const read = readCell(cell.value);
        if (read.kind === 'text') {
          cells.push(`${colNumber}:${read.text}`);
        } else if (read.kind === 'number') {
          cells.push(`${colNumber}:${read.value}`);
        }
      });
      if (cells.length > 0) {
        summaryLines.push(`r${rowNumber} ${cells.join(' | ')}`);
      }
    });
    const verses = readVerses(workbook, source.fileName, discrepancies);
    const frequency = readFrequency(workbook, source.fileName, discrepancies);
    const tierSheets = readTierSheets(workbook);
    const characterCounts: Record<string, number> = {};
    for (const verse of verses) {
      countCharacter(characterCounts, verse.verseText);
      if (verse.uniqueBeginning) {
        countCharacter(characterCounts, verse.uniqueBeginning);
      }
      if (verse.uniqueEnding) {
        countCharacter(characterCounts, verse.uniqueEnding);
      }
    }
    checkTierSheets(source.fileName, frequency, tierSheets, discrepancies);
    checkFrequencyRows(source.fileName, verses, frequency, discrepancies);
    const seenReferences = new Map<string, number>();
    const seenComponent = new Map<string, string>();
    for (const verse of verses) {
      const first = seenReferences.get(verse.reference);
      if (first !== undefined) {
        pushDiscrepancy(discrepancies, {
          workbook: source.fileName,
          kind: 'duplicate_verse_reference',
          detail: `${verse.reference} rows ${first} and ${verse.sourceRow}`,
        });
      } else {
        seenReferences.set(verse.reference, verse.sourceRow);
      }
      if (verse.book && verse.ch !== undefined && verse.v !== undefined) {
        if (!verse.reference.startsWith(verse.book) || !verse.reference.includes(`${verse.ch}:${verse.v}`)) {
          pushDiscrepancy(discrepancies, {
            workbook: source.fileName,
            kind: 'reference_components',
            detail: `${verse.reference} vs ${verse.book} ${verse.ch}:${verse.v}`,
          });
        }
        const component = `${verse.book}|${verse.ch}|${verse.v}`;
        const previous = seenComponent.get(component);
        if (previous !== undefined && previous !== verse.reference) {
          pushDiscrepancy(discrepancies, {
            workbook: source.fileName,
            kind: 'ambiguous_reference',
            detail: `${component} is ${previous} and ${verse.reference}`,
          });
        } else {
          seenComponent.set(component, verse.reference);
        }
      }
      if (verse.verseText.toLowerCase().length !== verse.verseText.length) {
        pushDiscrepancy(discrepancies, {
          workbook: source.fileName,
          kind: 'lowercase_length',
          detail: verse.reference,
        });
      }
    }
    rawWorkbooks.push({
      fileName: source.fileName,
      sha256,
      sheetNames,
      summaryLines,
      verses,
      frequency,
      tierSheets,
      characterCounts,
    });
  }

  const draft = await buildOfficialSponsorDraft({
    directory: LOCAL_DIR,
    seasonDates: CONFIRMED_SEASON_DATES,
  });
  if (draft.status !== 'passed' || !draft.pipeline.content) {
    pushDiscrepancy(discrepancies, {
      workbook: 'draft',
      kind: 'draft_failed',
      detail: draft.pipeline.report.errors.map((item) => `${item.code}: ${item.reason}`).join(' | ').slice(0, 2000),
    });
  }

  const content = draft.pipeline.content;
  const materialSets = content?.materialSets.map((materialSet) => materialSetCounts(materialSet.materialSetId, materialSet.cards)) ?? [];
  if (content) {
    const byId = new Map(content.materialSets.map((materialSet) => [materialSet.materialSetId, materialSet]));
    for (const source of WPFBQ_2027_SPONSOR_PROFILE.sources) {
      const raw = rawWorkbooks.find((workbook) => workbook.fileName === source.fileName);
      const load = draft.loads.find((item) => item.source.fileName === source.fileName);
      if (!raw || !load) {
        pushDiscrepancy(discrepancies, { workbook: source.fileName, kind: 'missing_load', detail: source.fileName });
        continue;
      }
      if (load.verseList.rows.length !== raw.verses.length || load.frequencyWords.entries.length !== raw.frequency.length) {
        pushDiscrepancy(discrepancies, {
          workbook: source.fileName,
          kind: 'reader_row_count',
          detail: `verses ${raw.verses.length}/${load.verseList.rows.length}, frequency ${raw.frequency.length}/${load.frequencyWords.entries.length}`,
        });
      }
      raw.verses.forEach((verse, index) => {
        const read = load.verseList.rows[index];
        if (
          !read ||
          read.verseText !== verse.verseText ||
          read.reference !== verse.reference ||
          read.uniqueBeginning !== verse.uniqueBeginning ||
          read.uniqueEnding !== verse.uniqueEnding ||
          read.seq !== verse.seq
        ) {
          pushDiscrepancy(discrepancies, {
            workbook: source.fileName,
            kind: 'reader_changed_cell',
            detail: verse.reference,
          });
        }
      });
      const boundaries = new Map<number, ExpectedAnnotation[]>();
      for (const verse of raw.verses) {
        boundaries.set(verse.seq, expectedForVerse(source.fileName, verse, discrepancies));
      }
      const frequencyAnnotations = expectedFrequency(source.fileName, raw.verses, raw.frequency, discrepancies);
      for (const target of source.materialSets) {
        const materialSet = byId.get(target.materialSetId);
        if (!materialSet) {
          pushDiscrepancy(discrepancies, {
            workbook: source.fileName,
            kind: 'missing_material_set',
            detail: target.materialSetId,
          });
          continue;
        }
        if (materialSet.cards.length !== raw.verses.length || materialSet.sections.length !== 7) {
          pushDiscrepancy(discrepancies, {
            workbook: source.fileName,
            kind: 'material_set_shape',
            detail: `${target.materialSetId} cards ${materialSet.cards.length} sections ${materialSet.sections.length}`,
          });
        }
        raw.verses.forEach((verse, index) => {
          const card = materialSet.cards[index];
          if (!card) {
            return;
          }
          const expected = [
            ...(boundaries.get(verse.seq) ?? []),
            ...(frequencyAnnotations.get(verse.seq) ?? []),
          ];
          compareCard(source.fileName, target.materialSetId, verse, card, expected, discrepancies);
        });
      }
    }
    const intermediate = byId.get('intermediate-2027');
    const experienced = byId.get('experienced-2027');
    if (intermediate && experienced) {
      intermediate.cards.forEach((card, index) => {
        const other = experienced.cards[index];
        if (!other || card.annotations === other.annotations || card === other) {
          pushDiscrepancy(discrepancies, {
            workbook: 'WPFBQ_2027_Senior_Data_Workbook.xlsx',
            kind: 'shared_annotation_array',
            detail: card.reference,
          });
          return;
        }
        if (JSON.stringify(card.annotations) !== JSON.stringify(other.annotations)) {
          pushDiscrepancy(discrepancies, {
            workbook: 'WPFBQ_2027_Senior_Data_Workbook.xlsx',
            kind: 'senior_annotation_drift',
            detail: card.reference,
          });
        }
      });
    }
    const keys = new Set<string>();
    for (const materialSet of content.materialSets) {
      for (const card of materialSet.cards) {
        const key = `${card.seasonId}\u001f${card.materialSetId}\u001f${card.cardId}`;
        if (keys.has(key)) {
          pushDiscrepancy(discrepancies, { workbook: materialSet.materialSetId, kind: 'duplicate_card_key', detail: key });
        }
        keys.add(key);
      }
    }
  }

  const stats: WorkbookAuditStats[] = rawWorkbooks.map((workbook) => {
    const boundaries = boundaryStats(workbook.verses);
    const frequencyByTier: Record<number, { entries: number; occurrences: number }> = {};
    for (const entry of workbook.frequency) {
      const tier = frequencyByTier[entry.tier] ?? { entries: 0, occurrences: 0 };
      tier.entries += 1;
      tier.occurrences += entry.occurrences;
      frequencyByTier[entry.tier] = tier;
    }
    return {
      workbook: workbook.fileName,
      sha256: workbook.sha256,
      sheetNames: workbook.sheetNames,
      summaryLines: workbook.summaryLines,
      verseRows: workbook.verses.length,
      ...boundaries,
      frequencyEntries: workbook.frequency.length,
      frequencyOccurrences: workbook.frequency.reduce((sum, entry) => sum + entry.occurrences, 0),
      frequencyByTier,
      tierSheets: workbook.tierSheets.map((sheet) => ({
        name: sheet.name,
        words: sheet.words.length,
        headers: sheet.headers,
      })),
      characterCounts: workbook.characterCounts,
    };
  });

  return {
    discrepancyCount: discrepancies.length,
    discrepancies,
    stats,
    materialSets,
    totalGenerated: materialSets.reduce((sum, item) => sum + item.total, 0),
  };
}

if (process.argv[1]?.includes('independentSponsorAudit')) {
  auditOfficialSponsorAnnotations()
    .then((report) => {
      const printable = {
        discrepancyCount: report.discrepancyCount,
        discrepancies: report.discrepancies.slice(0, 40),
        discrepancyKinds: report.discrepancies.reduce<Record<string, number>>((counts, item) => {
          counts[item.kind] = (counts[item.kind] ?? 0) + 1;
          return counts;
        }, {}),
        totalGenerated: report.totalGenerated,
        materialSets: report.materialSets,
        stats: report.stats.map((item) => ({
          ...item,
          repeatedEndingCount: item.repeatedEndings.length,
          repeatedEndings: item.repeatedEndings.slice(0, 5),
        })),
      };
      console.log(JSON.stringify(printable, null, 2));
      if (report.discrepancyCount > 0) {
        process.exitCode = 1;
      }
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
