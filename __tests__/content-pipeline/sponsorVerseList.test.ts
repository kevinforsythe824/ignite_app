/**
 * @jest-environment node
 */
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { readSponsorProfileVerseLists, readSponsorVerseListBuffer, readSponsorVerseListFile, readSponsorWorkbookBuffer } from '../../scripts/content-pipeline/readSponsorVerseList';
import { interpretSponsorCell } from '../../scripts/content-pipeline/sponsorCell';
import {
  WPFBQ_2027_CADET_WORKBOOK_SOURCE,
  WPFBQ_2027_SPONSOR_PROFILE,
  type SponsorWorkbookSource,
} from '../../scripts/content-pipeline/sponsorSourceProfile';
import {
  SPONSOR_VERSE_LIST_COLUMNS,
  SPONSOR_VERSE_LIST_SHEET,
  type SponsorVerseListColumn,
  type SponsorVerseListResult,
  type SponsorVerseListRow,
} from '../../scripts/content-pipeline/sponsorSourceTypes';
import type { ValidationIssue } from '../../scripts/content-pipeline/types';

const WORKBOOK_NAME = 'fixture.xlsx';

type VerseRow = Partial<Record<SponsorVerseListColumn, ExcelJS.CellValue>>;

function card(
  seq: number,
  overrides: VerseRow = {},
): VerseRow {
  const opening = seq === 1;
  return {
    Seq: seq,
    Section: opening ? 'Opening' : 'Following',
    Battlefield: opening ? null : seq,
    Topic: 'Topic A',
    Question: opening ? null : 'Prompt A',
    Reference: `Sample ${seq}:1`,
    Book: 'Sample',
    Ch: seq,
    V: 1,
    'Unique Beginning': 'Alpha  start',
    'Unique Ending': 'end.',
    'Verse Text': `Alpha  line ${seq}; keep punctuation.`,
    ...overrides,
  };
}

async function buildVerseListBuffer(input: {
  headers?: readonly string[];
  rows?: readonly (VerseRow | 'blank')[];
  sheetName?: string | null;
  leadingSheets?: readonly string[];
  decorate?: (workbook: ExcelJS.Workbook) => void;
} = {}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  for (const name of input.leadingSheets ?? []) {
    workbook.addWorksheet(name);
  }
  const sheetName = input.sheetName === undefined ? SPONSOR_VERSE_LIST_SHEET : input.sheetName;
  if (sheetName !== null) {
    const sheet = workbook.addWorksheet(sheetName);
    const headers = input.headers ?? [...SPONSOR_VERSE_LIST_COLUMNS];
    headers.forEach((header, index) => {
      sheet.getRow(1).getCell(index + 1).value = header;
    });
    let excelRow = 2;
    for (const entry of input.rows ?? []) {
      if (entry !== 'blank') {
        headers.forEach((header, index) => {
          const key = header.trim() as SponsorVerseListColumn;
          if (Object.prototype.hasOwnProperty.call(entry, key)) {
            const value = entry[key];
            if (value !== undefined) {
              sheet.getRow(excelRow).getCell(index + 1).value = value;
            }
          }
        });
      }
      excelRow += 1;
    }
  }
  input.decorate?.(workbook);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function readBuffer(buffer: Buffer): Promise<SponsorVerseListResult> {
  return readSponsorVerseListBuffer(buffer, WORKBOOK_NAME);
}

function expectVerseList(result: SponsorVerseListResult) {
  if (!result.ok) {
    throw new Error(result.errors.map((item) => `${item.code} row ${item.row ?? '-'} ${item.field ?? ''}: ${item.reason}`).join('\n'));
  }
  return result.verseList;
}

function expectFailure(result: SponsorVerseListResult): readonly ValidationIssue[] {
  if (result.ok) {
    throw new Error('Expected the workbook to fail validation.');
  }
  expect(result).not.toHaveProperty('verseList');
  return result.errors;
}

describe('sponsor cell interpretation', () => {
  it('concatenates rich text in order and keeps every character', () => {
    expect(
      interpretSponsorCell({
        richText: [{ text: 'A ' }, { text: ' B' }, { text: '—' }],
      }),
    ).toEqual({ status: 'text', text: 'A  B—' });
  });

  it('treats only a fully empty string as blank and keeps surrounding spaces', () => {
    expect(interpretSponsorCell('')).toEqual({ status: 'blank' });
    expect(interpretSponsorCell('  Alpha  ')).toEqual({ status: 'text', text: '  Alpha  ' });
    expect(interpretSponsorCell(null)).toEqual({ status: 'blank' });
  });

  it('keeps numbers and cached formula text, and rejects hyperlinks, dates, and booleans', () => {
    expect(interpretSponsorCell(4)).toEqual({ status: 'number', value: 4 });
    expect(interpretSponsorCell({ formula: 'A1', result: 'Keep  spaces' })).toEqual({
      status: 'text',
      text: 'Keep  spaces',
    });
    expect(interpretSponsorCell({ formula: 'A1', result: 7 })).toEqual({ status: 'number', value: 7 });
    expect(interpretSponsorCell({ formula: 'A1' }).status).toBe('invalid');
    expect(interpretSponsorCell({ formula: 'A1', result: true }).status).toBe('invalid');
    expect(interpretSponsorCell({ text: 'Do not keep', hyperlink: 'https://example.invalid' }).status).toBe(
      'invalid',
    );
    expect(interpretSponsorCell(true).status).toBe('invalid');
    expect(interpretSponsorCell(new Date('2026-01-01T00:00:00Z')).status).toBe('invalid');
    expect(interpretSponsorCell({ error: '#N/A' }).status).toBe('invalid');
  });
});

describe('sponsor Verse List reader', () => {
  it('requires the sponsor header names', () => {
    expect([...SPONSOR_VERSE_LIST_COLUMNS]).toEqual([
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
    ]);
  });

  it('reads columns by header name and preserves exact reference, verse text, and row order', async () => {
    const headers = [
      'Notes',
      ...[...SPONSOR_VERSE_LIST_COLUMNS]
        .reverse()
        .map((header) => (header === 'Verse Text' ? ' Verse Text ' : header)),
    ];
    const buffer = await buildVerseListBuffer({
      headers,
      leadingSheets: ['Summary', 'All Frequency Words'],
      rows: [
        card(1, {
          Battlefield: null,
          Question: null,
          Reference: 'Sample  1:1 ',
          'Unique Beginning': { richText: [{ text: 'Al' }, { text: 'pha  ' }] } as unknown as ExcelJS.CellValue,
          'Verse Text': '  Alpha;  beta — gamma.  ',
          Topic: 'Topic A',
        }),
        card(2, {
          Seq: '2' as unknown as ExcelJS.CellValue,
          Battlefield: '4',
          Question: 'Prompt B',
          Reference: 'Sample  2:1',
          'Verse Text': { formula: '"Alpha"', result: 'Alpha  two; keep.' } as ExcelJS.CellValue,
        }),
      ],
      decorate(workbook) {
        const frequency = workbook.getWorksheet('All Frequency Words');
        frequency!.getCell('A1').value = true;
      },
    });

    const verseList = expectVerseList(await readBuffer(buffer));

    expect(verseList.sheetName).toBe('Verse List');
    expect(verseList.sections).toEqual(['Opening', 'Following']);
    expect(verseList.rows.map((row) => row.seq)).toEqual([1, 2]);
    expect(verseList.rows.map((row) => row.sourceRow)).toEqual([2, 3]);
    expect(verseList.rows[0]).toMatchObject({
      reference: 'Sample  1:1 ',
      verseText: '  Alpha;  beta — gamma.  ',
      uniqueBeginning: 'Alpha  ',
      topic: 'Topic A',
      ch: 1,
      v: 1,
      book: 'Sample',
      uniqueEnding: 'end.',
    });
    expect(verseList.rows[1]).toMatchObject({
      seq: 2,
      battlefield: '4',
      question: 'Prompt B',
      verseText: 'Alpha  two; keep.',
      reference: 'Sample  2:1',
    });
    expect(verseList.rows[0]).not.toHaveProperty('battlefield');
    expect(verseList.rows[0]).not.toHaveProperty('question');
    expect(verseList.rows[0]).not.toHaveProperty('studyContext');
    expect(verseList.rows[0]).not.toHaveProperty('annotations');
  });

  it('does not fill battlefield or question down from a neighboring row', async () => {
    const buffer = await buildVerseListBuffer({
      rows: [
        card(1, { Battlefield: null, Question: null }),
        card(2, { Battlefield: 2, Question: 'Prompt A', Section: 'Following' }),
        card(3, { Battlefield: null, Question: null, Section: 'Following' }),
      ],
    });

    const rows = expectVerseList(await readBuffer(buffer)).rows;

    expect(rows[0]).toMatchObject({ topic: 'Topic A' });
    expect(rows[0]).not.toHaveProperty('battlefield');
    expect(rows[0]).not.toHaveProperty('question');
    expect(rows[1]).toMatchObject({ battlefield: 2, question: 'Prompt A' });
    expect(rows[2]).toMatchObject({ section: 'Following' });
    expect(rows[2]).not.toHaveProperty('battlefield');
    expect(rows[2]).not.toHaveProperty('question');
    expect(rows[2]?.question).not.toBe(rows[1]?.question);
    expect(typeof rows[1]?.battlefield).toBe('number');
  });

  it('skips a fully blank row and reports the original Excel row numbers', async () => {
    const buffer = await buildVerseListBuffer({
      rows: [card(1, { Battlefield: 1, Question: 'Prompt A', Section: 'Opening' }), 'blank', card(2)],
    });

    const rows = expectVerseList(await readBuffer(buffer)).rows;

    expect(rows.map((row) => [row.sourceRow, row.seq])).toEqual([
      [2, 1],
      [4, 2],
    ]);
  });

  it('preserves a numeric battlefield and a numeric-string battlefield as different values', async () => {
    const buffer = await buildVerseListBuffer({
      rows: [
        card(1, { Battlefield: 4, Question: 'Prompt A', Section: 'Opening' }),
        card(2, { Battlefield: '4', Question: 'Prompt B' }),
      ],
    });

    const rows = expectVerseList(await readBuffer(buffer)).rows;

    expect(rows[0]?.battlefield).toBe(4);
    expect(typeof rows[0]?.battlefield).toBe('number');
    expect(rows[1]?.battlefield).toBe('4');
    expect(typeof rows[1]?.battlefield).toBe('string');
  });

  it('keeps whitespace-only text instead of treating it as a missing cell', async () => {
    const buffer = await buildVerseListBuffer({
      rows: [card(1, { Section: '   ', Reference: 'Ref  1 ', 'Verse Text': '  Alpha  ', Question: '   ' })],
    });

    const row = expectVerseList(await readBuffer(buffer)).rows[0];

    expect(row).toMatchObject({
      section: '   ',
      reference: 'Ref  1 ',
      verseText: '  Alpha  ',
      question: '   ',
    });
  });

  it('rejects a missing Verse List sheet', async () => {
    const buffer = await buildVerseListBuffer({
      sheetName: null,
      leadingSheets: ['Summary'],
    });

    const errors = expectFailure(await readBuffer(buffer));

    expect(errors).toEqual([
      expect.objectContaining({
        code: 'missing_sheet',
        workbook: WORKBOOK_NAME,
        sheet: 'Verse List',
        severity: 'error',
      }),
    ]);
  });

  it('rejects a missing required header', async () => {
    const buffer = await buildVerseListBuffer({
      headers: SPONSOR_VERSE_LIST_COLUMNS.filter((header) => header !== 'Reference'),
      rows: [card(1)],
    });

    const errors = expectFailure(await readBuffer(buffer));

    expect(errors.map((item) => item.code)).toEqual(['missing_header']);
    expect(errors[0]).toMatchObject({
      field: 'Reference',
      row: 1,
      sheet: 'Verse List',
      workbook: WORKBOOK_NAME,
    });
  });

  it('rejects a duplicated or spacing-ambiguous header', async () => {
    const buffer = await buildVerseListBuffer({
      headers: ['Seq', ' Seq', ...SPONSOR_VERSE_LIST_COLUMNS.filter((header) => header !== 'Seq')],
      rows: [card(1)],
    });

    const errors = expectFailure(await readBuffer(buffer));

    expect(errors.map((item) => item.code)).toEqual(['duplicate_header']);
    expect(errors[0]).toMatchObject({ field: 'Seq', row: 1, sheet: 'Verse List' });
  });

  it('rejects valid headers when the Verse List has no Scripture Cards', async () => {
    const headersOnly = await buildVerseListBuffer();
    const blankRows = await buildVerseListBuffer({
      rows: ['blank', 'blank'],
      decorate(workbook) {
        const sheet = workbook.getWorksheet(SPONSOR_VERSE_LIST_SHEET);
        if (!sheet) {
          throw new Error('Expected a Verse List sheet.');
        }
        sheet.getRow(2).getCell(20).value = 'not a scripture card';
        sheet.getRow(3).getCell(20).value = 'also not a scripture card';
      },
    });

    for (const buffer of [headersOnly, blankRows]) {
      const errors = expectFailure(await readBuffer(buffer));
      expect(errors).toEqual([
        expect.objectContaining({
          severity: 'error',
          code: 'empty_verse_list',
          workbook: WORKBOOK_NAME,
          sheet: 'Verse List',
          reason: 'Verse List must contain at least one Scripture Card.',
        }),
      ]);
    }
  });

  it('rejects a missing seq when other card fields are present', async () => {
    const buffer = await buildVerseListBuffer({
      rows: [card(1, { Seq: null })],
    });

    const errors = expectFailure(await readBuffer(buffer));

    expect(errors).toEqual([
      expect.objectContaining({ code: 'missing_seq', field: 'Seq', row: 2 }),
    ]);
  });

  it.each([
    ['a fractional number', 1.5],
    ['zero', 0],
    ['a negative number', -1],
    ['a zero-padded string', '01'],
    ['a spaced numeric string', ' 2'],
    ['a word', 'abc'],
  ] as const)('rejects seq that is %s', async (_label, seq) => {
    const buffer = await buildVerseListBuffer({
      rows: [card(1, { Seq: seq as unknown as ExcelJS.CellValue })],
    });

    const errors = expectFailure(await readBuffer(buffer));

    expect(errors).toEqual([
      expect.objectContaining({ code: 'invalid_seq', field: 'Seq', row: 2 }),
    ]);
  });

  it('rejects a boolean seq instead of coercing it', async () => {
    const buffer = await buildVerseListBuffer({
      rows: [card(1, { Seq: true as unknown as ExcelJS.CellValue })],
    });

    const errors = expectFailure(await readBuffer(buffer));

    expect(errors).toEqual([
      expect.objectContaining({ code: 'unexpected_cell_type', field: 'Seq', row: 2 }),
    ]);
  });

  it('rejects a duplicate seq', async () => {
    const buffer = await buildVerseListBuffer({
      rows: [card(1, { Battlefield: 1, Question: 'Prompt A', Section: 'Opening' }), card(2, { Seq: 1 })],
    });

    const errors = expectFailure(await readBuffer(buffer));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'duplicate_seq',
          field: 'Seq',
          row: 3,
          reason: 'Seq duplicates row 2.',
        }),
      ]),
    );
  });

  it('rejects a sequence gap', async () => {
    const buffer = await buildVerseListBuffer({
      rows: [card(1), card(2), card(3, { Seq: 4 })],
    });

    const errors = expectFailure(await readBuffer(buffer));

    expect(errors).toEqual([
      expect.objectContaining({
        code: 'sequence_gap',
        field: 'Seq',
        row: 4,
        reason: 'Seq must run from 1 through 3 in source order. Expected 3 and found 4.',
      }),
    ]);
  });

  it('rejects seq values that are out of contiguous order', async () => {
    const buffer = await buildVerseListBuffer({
      rows: [card(1), card(2, { Seq: 3 }), card(3, { Seq: 2 })],
    });

    const errors = expectFailure(await readBuffer(buffer));

    expect(errors.map((item) => item.reason)).toEqual([
      'Seq must run from 1 through 3 in source order. Expected 2 and found 3.',
      'Seq must run from 1 through 3 in source order. Expected 3 and found 2.',
    ]);
  });

  it.each([
    ['Reference', 'missing_reference'],
    ['Verse Text', 'missing_verse_text'],
    ['Section', 'missing_section'],
  ] as const)('rejects a missing %s', async (field, code) => {
    const buffer = await buildVerseListBuffer({
      rows: [card(1, { [field]: null })],
    });

    const errors = expectFailure(await readBuffer(buffer));

    expect(errors).toEqual([
      expect.objectContaining({ code, field, row: 2, sheet: 'Verse List', workbook: WORKBOOK_NAME }),
    ]);
  });

  it('rejects a duplicate reference without echoing the reference', async () => {
    const buffer = await buildVerseListBuffer({
      rows: [
        card(1, { Reference: 'Sample  1:1 ', Battlefield: 1, Question: 'Prompt A', Section: 'Opening' }),
        card(2, { Reference: 'Sample  1:1 ' }),
      ],
    });

    const errors = expectFailure(await readBuffer(buffer));

    expect(errors).toEqual([
      expect.objectContaining({
        code: 'duplicate_reference',
        field: 'Reference',
        row: 3,
        reason: 'Reference duplicates row 2.',
      }),
    ]);
    expect(errors.some((item) => item.reason.includes('Sample'))).toBe(false);
  });

  it.each([
    ['a boolean', true],
    ['a date', new Date('2026-01-02T00:00:00Z')],
    ['a hyperlink', { text: 'Do not keep', hyperlink: 'https://example.invalid/verse' }],
    ['a number', 424242],
  ] as const)('rejects verse text that is %s', async (_label, verseText) => {
    const buffer = await buildVerseListBuffer({
      rows: [card(1, { 'Verse Text': verseText as unknown as ExcelJS.CellValue })],
    });

    const errors = expectFailure(await readBuffer(buffer));
    const serialized = JSON.stringify(errors);

    expect(errors).toEqual([
      expect.objectContaining({
        code: 'unexpected_cell_type',
        field: 'Verse Text',
        row: 2,
      }),
    ]);
    expect(serialized).not.toContain('Do not keep');
    expect(serialized).not.toContain('424242');
  });

  it.each([
    ['Ch', 0],
    ['Ch', -1],
    ['Ch', 1.5],
    ['V', 0],
    ['V', -8],
    ['V', 2.25],
  ] as const)('rejects numeric %s value %s', async (field, value) => {
    const buffer = await buildVerseListBuffer({
      rows: [card(1, { [field]: value })],
    });

    const errors = expectFailure(await readBuffer(buffer));

    expect(errors).toEqual([
      expect.objectContaining({
        severity: 'error',
        code: 'invalid_integer',
        workbook: WORKBOOK_NAME,
        sheet: 'Verse List',
        row: 2,
        field,
        reason: `${field} must be a positive whole number greater than zero.`,
      }),
    ]);
  });

  it('keeps blank Ch and V blank and accepts a positive whole number', async () => {
    const buffer = await buildVerseListBuffer({
      rows: [
        card(1, { Ch: null, V: null }),
        card(2, { Ch: 3, V: 16 }),
      ],
    });

    const rows = expectVerseList(await readBuffer(buffer)).rows;

    expect(rows[0]).not.toHaveProperty('ch');
    expect(rows[0]).not.toHaveProperty('v');
    expect(rows[1]).toMatchObject({ ch: 3, v: 16 });
  });

  it('keeps canonical numeric Ch and V strings and rejects non-numeric text', async () => {
    const accepted = await buildVerseListBuffer({
      rows: [card(1, { Ch: '12', V: '3' })],
    });
    expect(expectVerseList(await readBuffer(accepted)).rows[0]).toMatchObject({ ch: 12, v: 3 });

    const rejected = await buildVerseListBuffer({
      rows: [card(1, { Ch: 'abc', V: '01' })],
    });
    const errors = expectFailure(await readBuffer(rejected));

    expect(errors).toEqual([
      expect.objectContaining({
        code: 'invalid_integer',
        field: 'Ch',
        row: 2,
        reason: 'Ch must be an integer when provided.',
      }),
      expect.objectContaining({
        code: 'invalid_integer',
        field: 'V',
        row: 2,
        reason: 'V must be an integer when provided.',
      }),
    ]);
  });

  it('rejects a partial row instead of skipping it', async () => {
    const buffer = await buildVerseListBuffer({
      rows: [
        {
          Topic: 'Orphan topic',
        },
      ],
    });

    const errors = expectFailure(await readBuffer(buffer));

    expect(errors.map((item) => item.code).sort()).toEqual([
      'missing_reference',
      'missing_section',
      'missing_seq',
      'missing_verse_text',
    ]);
    expect(errors.every((item) => item.row === 2 && item.workbook === WORKBOOK_NAME)).toBe(true);
  });

  it('reports a missing workbook file', async () => {
    const missing = path.join(os.tmpdir(), `ignite-missing-sponsor-${process.pid}.xlsx`);

    const result = await readSponsorVerseListFile(missing);

    const errors = expectFailure(result);
    expect(errors).toEqual([
      expect.objectContaining({
        code: 'missing_file',
        workbook: path.basename(missing),
      }),
    ]);
    expect(errors[0]?.sheet).toBeUndefined();
    expect(errors[0]?.reason).not.toContain(os.tmpdir());
  });

  it('reports an unreadable workbook file', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-sponsor-bad-'));
    const filePath = path.join(directory, 'broken.xlsx');
    try {
      await writeFile(filePath, 'not a workbook');
      const errors = expectFailure(await readSponsorVerseListFile(filePath));
      expect(errors).toEqual([
        expect.objectContaining({
          code: 'unreadable_workbook',
          workbook: 'broken.xlsx',
        }),
      ]);
      expect(errors[0]?.reason).not.toContain(directory);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe('sponsor source profile', () => {
  it('maps beginner, junior, and one senior workbook onto the 2027 material set ids', () => {
    expect(WPFBQ_2027_SPONSOR_PROFILE.seasonId).toBe('2027');
    expect(WPFBQ_2027_SPONSOR_PROFILE.sources.map((source) => ({
      sourceId: source.sourceId,
      fileName: source.fileName,
      materialSetIds: source.materialSets.map((target) => target.materialSetId),
    }))).toEqual([
      {
        sourceId: 'beginner',
        fileName: 'WPFBQ_2027_Beginner_Data_Workbook.xlsx',
        materialSetIds: ['beginner-2027'],
      },
      {
        sourceId: 'junior',
        fileName: 'WPFBQ_2027_Junior_Data_Workbook.xlsx',
        materialSetIds: ['junior-2027'],
      },
      {
        sourceId: 'senior',
        fileName: 'WPFBQ_2027_Senior_Data_Workbook.xlsx',
        materialSetIds: ['intermediate-2027', 'experienced-2027'],
      },
    ]);
    expect(WPFBQ_2027_SPONSOR_PROFILE.sources.map((source) => source.fileName)).not.toContain(
      WPFBQ_2027_CADET_WORKBOOK_SOURCE.fileName,
    );
  });

  it('associates one senior workbook read with intermediate and experienced', async () => {
    const senior = WPFBQ_2027_SPONSOR_PROFILE.sources.find((source) => source.sourceId === 'senior');
    if (!senior) {
      throw new Error('Expected the senior sponsor source.');
    }
    const buffer = await buildVerseListBuffer({
      rows: [card(1, { Battlefield: 1, Question: 'Prompt A', Section: 'Opening' }), card(2)],
    });

    const result = await readSponsorWorkbookBuffer(buffer, senior);

    if (!result.ok) {
      throw new Error(result.errors.map((item) => item.reason).join('\n'));
    }
    expect(result).not.toHaveProperty('materialSets');
    expect(result.verseList.rows).toHaveLength(2);
    expect(result.source.materialSets).toEqual([
      { divisionId: 'intermediate', materialSetId: 'intermediate-2027' },
      { divisionId: 'experienced', materialSetId: 'experienced-2027' },
    ]);
  });

  it('describes a future Cadet source and reads it with the same Verse List parser', async () => {
    const cadet: SponsorWorkbookSource = WPFBQ_2027_CADET_WORKBOOK_SOURCE;
    expect(cadet).toEqual({
      sourceId: 'cadet',
      fileName: 'WPFBQ_2027_Cadet_Data_Workbook.xlsx',
      materialSets: [{ divisionId: 'cadet', materialSetId: 'cadet-2027' }],
    });

    const buffer = await buildVerseListBuffer({
      rows: [card(1, { Battlefield: null, Question: null, Section: 'Cadet opening' })],
    });
    const result = await readSponsorWorkbookBuffer(buffer, cadet);

    if (!result.ok) {
      throw new Error(result.errors.map((item) => item.reason).join('\n'));
    }
    expect(result.verseList.rows).toHaveLength(1);
    expect(result.verseList.rows[0]?.section).toBe('Cadet opening');
    expect(result.source.materialSets).toEqual([{ divisionId: 'cadet', materialSetId: 'cadet-2027' }]);
  });

  it('reads the three-workbook profile from temp files while the Cadet file is absent', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-sponsor-profile-'));
    try {
      const buffer = await buildVerseListBuffer({
        rows: [card(1, { Battlefield: 1, Question: 'Prompt A', Section: 'Opening' })],
      });
      for (const source of WPFBQ_2027_SPONSOR_PROFILE.sources) {
        await writeFile(path.join(directory, source.fileName), buffer);
      }
      expect(existsSync(path.join(directory, WPFBQ_2027_CADET_WORKBOOK_SOURCE.fileName))).toBe(false);

      const result = await readSponsorProfileVerseLists(directory, WPFBQ_2027_SPONSOR_PROFILE);

      if (!result.ok) {
        throw new Error(result.errors.map((item) => item.reason).join('\n'));
      }
      expect(result.reads.map((item) => item.source.sourceId)).toEqual(['beginner', 'junior', 'senior']);
      expect(result.reads).toHaveLength(3);
      const senior = result.reads[2];
      expect(senior?.verseList.rows).toHaveLength(1);
      expect(senior?.source.materialSets.map((target) => target.materialSetId)).toEqual([
        'intermediate-2027',
        'experienced-2027',
      ]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('fails closed when a profile lists Cadet and that file is missing', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-sponsor-cadet-'));
    try {
      const buffer = await buildVerseListBuffer({
        rows: [card(1, { Battlefield: 1, Question: 'Prompt A', Section: 'Opening' })],
      });
      for (const source of WPFBQ_2027_SPONSOR_PROFILE.sources) {
        await writeFile(path.join(directory, source.fileName), buffer);
      }
      const profile = {
        seasonId: WPFBQ_2027_SPONSOR_PROFILE.seasonId,
        sources: [...WPFBQ_2027_SPONSOR_PROFILE.sources, WPFBQ_2027_CADET_WORKBOOK_SOURCE],
      };

      const result = await readSponsorProfileVerseLists(directory, profile);

      if (result.ok) {
        throw new Error('Expected the missing Cadet workbook to fail the profile read.');
      }
      expect(result).not.toHaveProperty('reads');
      expect(result.errors).toEqual([
        expect.objectContaining({
          code: 'missing_file',
          workbook: WPFBQ_2027_CADET_WORKBOOK_SOURCE.fileName,
        }),
      ]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('keeps local sponsor workbooks gitignored', () => {
    const gitignore = readFileSync(path.join(process.cwd(), '.gitignore'), 'utf8');
    expect(gitignore).toMatch(/^content\/authoring\/local\/$/m);
  });
});

const OFFICIAL_SECTIONS = [
  'Prepare Yourself for Battle',
  'Helmet of Salvation',
  'The Belt of Truth',
  'Breastplate of Righteousness',
  'Shoes of the Gospel of Peace',
  'Shield of Faith',
  'Sword of the Spirit',
] as const;

const OFFICIAL_EXPECTATIONS = [
  { sourceId: 'beginner', cards: 150, prepareBlankRows: 10, battlefieldKind: 'number' },
  { sourceId: 'junior', cards: 250, prepareBlankRows: 12, battlefieldKind: 'string' },
  { sourceId: 'senior', cards: 392, prepareBlankRows: 12, battlefieldKind: 'number' },
] as const;

function officialWorkbooksPresent(): boolean {
  const directory = path.join(process.cwd(), 'content/authoring/local');
  return WPFBQ_2027_SPONSOR_PROFILE.sources.every((source) =>
    existsSync(path.join(directory, source.fileName)),
  );
}

function assertUnique(values: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(`Duplicate ${label} in a sponsor workbook.`);
    }
    seen.add(value);
  }
}

function expectPreserved(actual: unknown, raw: ExcelJS.CellValue, label: string): void {
  const expected = raw === null || raw === undefined || raw === '' ? undefined : raw;
  if (expected === undefined) {
    if (actual !== undefined) {
      throw new Error(`${label} was present when the sponsor cell is blank.`);
    }
    return;
  }
  if (typeof expected !== 'string' && typeof expected !== 'number') {
    throw new Error(`${label} sponsor cell is ${typeof expected}.`);
  }
  const actualLength = typeof actual === 'string' ? actual.length : -1;
  const expectedLength = typeof expected === 'string' ? expected.length : -1;
  if (actual !== expected || typeof actual !== typeof expected) {
    throw new Error(
      `${label} was not preserved (sponsor ${typeof expected} length ${expectedLength}, parsed ${typeof actual} length ${actualLength}).`,
    );
  }
}

const officialDescribe = officialWorkbooksPresent() ? describe : describe.skip;

officialDescribe('official local sponsor workbooks (skipped when the gitignored files are absent)', () => {
  it('reads each Verse List once, preserves source cells, and keeps Prepare blanks blank', async () => {
    const directory = path.join(process.cwd(), 'content/authoring/local');
    const result = await readSponsorProfileVerseLists(directory, WPFBQ_2027_SPONSOR_PROFILE);
    if (!result.ok) {
      throw new Error(result.errors.map((item) => `${item.code}: ${item.reason}`).join('\n'));
    }

    expect(result.reads.map((item) => item.source.sourceId)).toEqual(['beginner', 'junior', 'senior']);

    for (const expected of OFFICIAL_EXPECTATIONS) {
      const read = result.reads.find((item) => item.source.sourceId === expected.sourceId);
      if (!read) {
        throw new Error(`Missing ${expected.sourceId} read.`);
      }
      const rows = read.verseList.rows;
      expect(rows).toHaveLength(expected.cards);
      expect(read.verseList.sections).toEqual([...OFFICIAL_SECTIONS]);
      expect(rows.map((row) => row.seq)).toEqual(rows.map((_, index) => index + 1));
      expect(rows.map((row) => row.sourceRow)).toEqual(rows.map((_, index) => index + 2));
      assertUnique(rows.map((row) => row.reference), 'reference');
      assertUnique(rows.map((row) => String(row.seq)), 'seq');

      const prepare = rows.slice(0, expected.prepareBlankRows);
      expect(prepare.every((row) => row.section === OFFICIAL_SECTIONS[0])).toBe(true);
      expect(prepare.every((row) => row.battlefield === undefined && row.question === undefined)).toBe(true);
      const following = rows[expected.prepareBlankRows];
      if (
        following?.battlefield === undefined ||
        following.question === undefined ||
        typeof following.battlefield !== expected.battlefieldKind
      ) {
        throw new Error(
          `${expected.sourceId} battlefield after Prepare was ${typeof following?.battlefield}.`,
        );
      }

      await expectOfficialCells(directory, read.source.fileName, rows);
    }

    const senior = result.reads.find((item) => item.source.sourceId === 'senior');
    expect(senior?.source.materialSets.map((target) => target.materialSetId)).toEqual([
      'intermediate-2027',
      'experienced-2027',
    ]);
    expect(result.reads).toHaveLength(3);
  });
});

async function expectOfficialCells(
  directory: string,
  fileName: string,
  rows: readonly SponsorVerseListRow[],
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(directory, fileName));
  const sheet = workbook.getWorksheet(SPONSOR_VERSE_LIST_SHEET);
  if (!sheet) {
    throw new Error(`Missing Verse List in ${fileName}.`);
  }
  const columns = new Map<string, number>();
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    if (typeof cell.value === 'string') {
      columns.set(cell.value.trim(), colNumber);
    }
  });
  const fields: readonly { header: SponsorVerseListColumn; read: (row: SponsorVerseListRow) => unknown }[] = [
    { header: 'Seq', read: (row) => row.seq },
    { header: 'Section', read: (row) => row.section },
    { header: 'Battlefield', read: (row) => row.battlefield },
    { header: 'Topic', read: (row) => row.topic },
    { header: 'Question', read: (row) => row.question },
    { header: 'Reference', read: (row) => row.reference },
    { header: 'Book', read: (row) => row.book },
    { header: 'Ch', read: (row) => row.ch },
    { header: 'V', read: (row) => row.v },
    { header: 'Unique Beginning', read: (row) => row.uniqueBeginning },
    { header: 'Unique Ending', read: (row) => row.uniqueEnding },
    { header: 'Verse Text', read: (row) => row.verseText },
  ];

  for (const row of rows) {
    const excelRow = sheet.getRow(row.sourceRow);
    for (const field of fields) {
      const colNumber = columns.get(field.header);
      if (colNumber === undefined) {
        throw new Error(`Missing ${field.header} in ${fileName}.`);
      }
      expectPreserved(
        field.read(row),
        excelRow.getCell(colNumber).value,
        `${fileName} row ${row.sourceRow} ${field.header}`,
      );
    }
  }
}
