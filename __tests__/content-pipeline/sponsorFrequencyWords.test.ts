/**
 * @jest-environment node
 */
import ExcelJS from 'exceljs';
import { readSponsorFrequencyWords } from '../../scripts/content-pipeline/readSponsorFrequencyWords';
import {
  SPONSOR_FREQUENCY_COLUMNS,
  SPONSOR_FREQUENCY_SHEET,
  SPONSOR_REFERENCE_SEPARATOR,
} from '../../scripts/content-pipeline/sponsorFrequencyTypes';

const WORKBOOK_NAME = 'fixture.xlsx';

type FrequencyRow = readonly [
  ExcelJS.CellValue | undefined,
  ExcelJS.CellValue | undefined,
  ExcelJS.CellValue | undefined,
  ExcelJS.CellValue | undefined,
  ExcelJS.CellValue | undefined,
  ExcelJS.CellValue | undefined,
];

function buildWorkbook(input: {
  includeSheet?: boolean;
  headers?: readonly string[];
  rows?: readonly FrequencyRow[];
  tierSheets?: readonly { name: string; words: readonly string[] }[];
} = {}): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  if (input.includeSheet !== false) {
    const sheet = workbook.addWorksheet(SPONSOR_FREQUENCY_SHEET);
    const headers = input.headers ?? [...SPONSOR_FREQUENCY_COLUMNS];
    headers.forEach((header, index) => {
      sheet.getRow(1).getCell(index + 1).value = header;
    });
    for (const [rowIndex, row] of (input.rows ?? []).entries()) {
      row.forEach((value, index) => {
        if (value !== undefined) {
          sheet.getRow(rowIndex + 2).getCell(index + 1).value = value;
        }
      });
    }
  } else {
    workbook.addWorksheet('Summary');
  }
  for (const tierSheet of input.tierSheets ?? []) {
    const sheet = workbook.addWorksheet(tierSheet.name);
    sheet.getRow(1).getCell(1).value = 'Word';
    tierSheet.words.forEach((word, index) => {
      sheet.getRow(index + 2).getCell(1).value = word;
    });
  }
  return workbook;
}

function wordRow(
  word: string,
  input: { class?: ExcelJS.CellValue; verses?: number; occurrences?: number; repeats?: string; references?: string } = {},
): FrequencyRow {
  return [
    input.class === undefined ? 1 : input.class,
    word,
    input.verses ?? 1,
    input.occurrences ?? 1,
    input.repeats,
    input.references ?? 'A 1:1',
  ];
}

describe('sponsor frequency words', () => {
  it('reads All Frequency Words and allows a missing higher tier', () => {
    const result = readSponsorFrequencyWords(
      buildWorkbook({
        rows: [wordRow('alpha'), wordRow('far', { occurrences: 2, repeats: 'YES' })],
        tierSheets: [{ name: '1x Words (Blue)', words: ['alpha', 'far'] }],
      }),
      WORKBOOK_NAME,
    );
    if (!result.ok) {
      throw new Error(result.errors.map((item) => item.reason).join('\n'));
    }
    expect(result.frequencyWords.entries).toEqual([
      {
        sourceRow: 2,
        word: 'alpha',
        tier: 1,
        verses: 1,
        occurrences: 1,
        repeatsInVerse: false,
        references: ['A 1:1'],
      },
      {
        sourceRow: 3,
        word: 'far',
        tier: 1,
        verses: 1,
        occurrences: 2,
        repeatsInVerse: true,
        references: ['A 1:1'],
      },
    ]);
  });

  it('fails closed when the frequency sheet is missing', () => {
    const result = readSponsorFrequencyWords(buildWorkbook({ includeSheet: false }), WORKBOOK_NAME);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: 'missing_sheet',
        workbook: WORKBOOK_NAME,
        sheet: SPONSOR_FREQUENCY_SHEET,
      }),
    ]);
  });

  it('fails closed on a class outside 1 through 5', () => {
    const result = readSponsorFrequencyWords(
      buildWorkbook({ rows: [wordRow('alpha', { class: 9 })] }),
      WORKBOOK_NAME,
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'invalid_class',
          sheet: SPONSOR_FREQUENCY_SHEET,
          row: 2,
          field: 'Class',
        }),
      ]),
    );
    expect(result.errors.some((item) => item.reason.includes('1 through 5'))).toBe(true);
  });

  it('fails closed on a duplicate word', () => {
    const result = readSponsorFrequencyWords(
      buildWorkbook({
        rows: [wordRow('alpha'), wordRow('ALPHA')],
        tierSheets: [{ name: '1x Words', words: ['alpha'] }],
      }),
      WORKBOOK_NAME,
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: 'duplicate_frequency_word',
        sheet: SPONSOR_FREQUENCY_SHEET,
        row: 3,
        field: 'Word',
      }),
    ]);
  });

  it('fails closed when the same word is listed in two classes', () => {
    const references = ['A 1:1', 'B 2:2'].join(SPONSOR_REFERENCE_SEPARATOR);
    const result = readSponsorFrequencyWords(
      buildWorkbook({
        rows: [wordRow('alpha'), wordRow('Alpha', { class: 2, verses: 2, occurrences: 2, references })],
        tierSheets: [
          { name: '1x Words', words: ['alpha'] },
          { name: '2x Words', words: ['alpha'] },
        ],
      }),
      WORKBOOK_NAME,
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: 'conflicting_class',
        sheet: SPONSOR_FREQUENCY_SHEET,
        row: 3,
        field: 'Class',
      }),
    ]);
  });

  it('fails closed on an empty frequency sheet', () => {
    const result = readSponsorFrequencyWords(buildWorkbook({ rows: [] }), WORKBOOK_NAME);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: 'empty_frequency_words',
        workbook: WORKBOOK_NAME,
        sheet: SPONSOR_FREQUENCY_SHEET,
      }),
    ]);
  });

  it('fails closed when the reference count disagrees with Verses', () => {
    const result = readSponsorFrequencyWords(
      buildWorkbook({
        rows: [wordRow('alpha', { class: 2, verses: 2, occurrences: 2, references: 'A 1:1' })],
      }),
      WORKBOOK_NAME,
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: 'inconsistent_references',
        sheet: SPONSOR_FREQUENCY_SHEET,
        row: 2,
        field: 'References',
      }),
    ]);
  });

  it('fails closed when the repeats flag disagrees with the counts', () => {
    const marked = readSponsorFrequencyWords(
      buildWorkbook({
        rows: [wordRow('alpha', { repeats: 'YES' })],
      }),
      WORKBOOK_NAME,
    );
    const blank = readSponsorFrequencyWords(
      buildWorkbook({
        rows: [wordRow('alpha', { occurrences: 2 })],
      }),
      WORKBOOK_NAME,
    );
    for (const result of [marked, blank]) {
      expect(result.ok).toBe(false);
      if (result.ok) {
        continue;
      }
      expect(result.errors).toEqual([
        expect.objectContaining({
          code: 'inconsistent_repeats_flag',
          field: 'Repeats In Verse',
          row: 2,
        }),
      ]);
    }
  });

  it('splits references only on space, middle dot, space', () => {
    const separated = ['John 3:16', 'Acts 1:1'].join(SPONSOR_REFERENCE_SEPARATOR);
    const split = readSponsorFrequencyWords(
      buildWorkbook({
        rows: [wordRow('alpha', { class: 2, verses: 2, occurrences: 2, references: separated })],
        tierSheets: [{ name: '2x Words', words: ['alpha'] }],
      }),
      WORKBOOK_NAME,
    );
    if (!split.ok) {
      throw new Error(split.errors.map((item) => item.reason).join('\n'));
    }
    expect(split.frequencyWords.entries[0]?.references).toEqual(['John 3:16', 'Acts 1:1']);

    const glued = readSponsorFrequencyWords(
      buildWorkbook({
        rows: [wordRow('alpha', { references: 'Song·of Solomon 1:1' })],
        tierSheets: [{ name: '1x Words', words: ['alpha'] }],
      }),
      WORKBOOK_NAME,
    );
    if (!glued.ok) {
      throw new Error(glued.errors.map((item) => item.reason).join('\n'));
    }
    expect(glued.frequencyWords.entries[0]?.references).toEqual(['Song·of Solomon 1:1']);
  });

  it('fails closed on a duplicated reference inside one cell', () => {
    const references = ['A 1:1', 'A 1:1'].join(SPONSOR_REFERENCE_SEPARATOR);
    const result = readSponsorFrequencyWords(
      buildWorkbook({
        rows: [wordRow('alpha', { class: 2, verses: 2, occurrences: 2, references })],
        tierSheets: [{ name: '2x Words', words: ['alpha'] }],
      }),
      WORKBOOK_NAME,
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'duplicate_reference',
          sheet: SPONSOR_FREQUENCY_SHEET,
          row: 2,
          field: 'References',
        }),
      ]),
    );
  });

  it('fails closed when a tier sheet contradicts All Frequency Words', () => {
    const workbook = buildWorkbook({
      rows: [wordRow('alpha', { occurrences: 2, repeats: 'YES' })],
      tierSheets: [{ name: '1x Words', words: ['alpha'] }],
    });
    const sheet = workbook.getWorksheet('1x Words');
    if (!sheet) {
      throw new Error('expected the tier sheet');
    }
    sheet.getRow(1).getCell(2).value = 'Occurrences';
    sheet.getRow(2).getCell(2).value = 9;
    const result = readSponsorFrequencyWords(workbook, WORKBOOK_NAME);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: 'inconsistent_tier_sheet',
        sheet: '1x Words',
        field: 'Word',
      }),
    ]);
    expect(result.errors[0]?.reason).toContain('alpha');
  });

  it('rejects duplicate tier sheets when the first worksheet is listed first', () => {
    expectDuplicateTierSheets('1x Words', '1x Words (Blue)');
  });

  it('rejects duplicate tier sheets when the second worksheet is listed first', () => {
    expectDuplicateTierSheets('1x Words (Blue)', '1x Words');
  });

  it('fails closed when a populated tier-sheet row has a numeric Word', () => {
    const workbook = buildWorkbook({
      rows: [wordRow('alpha')],
      tierSheets: [{ name: '1x Words', words: ['alpha'] }],
    });
    const sheet = workbook.getWorksheet('1x Words');
    if (!sheet) {
      throw new Error('expected the tier sheet');
    }
    sheet.getRow(3).getCell(1).value = 12;
    const result = readSponsorFrequencyWords(workbook, WORKBOOK_NAME);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors).toEqual([
      expect.objectContaining({
        severity: 'error',
        code: 'unexpected_cell_type',
        workbook: WORKBOOK_NAME,
        sheet: '1x Words',
        row: 3,
        field: 'Word',
        reason: 'Word must be text.',
      }),
    ]);
  });

  it('fails closed when a populated tier-sheet row leaves Word blank', () => {
    const workbook = buildWorkbook({
      rows: [wordRow('alpha')],
      tierSheets: [{ name: '1x Words', words: ['alpha'] }],
    });
    const sheet = workbook.getWorksheet('1x Words');
    if (!sheet) {
      throw new Error('expected the tier sheet');
    }
    sheet.getRow(1).getCell(2).value = 'Notes';
    sheet.getRow(3).getCell(2).value = 'present';
    const result = readSponsorFrequencyWords(workbook, WORKBOOK_NAME);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors).toEqual([
      expect.objectContaining({
        severity: 'error',
        code: 'missing_word',
        workbook: WORKBOOK_NAME,
        sheet: '1x Words',
        row: 3,
        field: 'Word',
        reason: 'Word is required.',
      }),
    ]);
  });

  it('fails closed when a populated tier-sheet row has no Word column', () => {
    const workbook = buildWorkbook({
      rows: [wordRow('alpha')],
      tierSheets: [{ name: '1x Words', words: [] }],
    });
    const sheet = workbook.getWorksheet('1x Words');
    if (!sheet) {
      throw new Error('expected the tier sheet');
    }
    sheet.getRow(1).getCell(1).value = 'Verses';
    sheet.getRow(2).getCell(1).value = 1;
    const result = readSponsorFrequencyWords(workbook, WORKBOOK_NAME);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          code: 'missing_word',
          workbook: WORKBOOK_NAME,
          sheet: '1x Words',
          row: 2,
          field: 'Word',
          reason: 'Word is required.',
        }),
      ]),
    );
  });

  it('ignores a completely empty tier-sheet row', () => {
    const workbook = buildWorkbook({
      rows: [wordRow('alpha')],
      tierSheets: [{ name: '1x Words', words: ['alpha'] }],
    });
    const sheet = workbook.getWorksheet('1x Words');
    if (!sheet) {
      throw new Error('expected the tier sheet');
    }
    sheet.getRow(4);
    const result = readSponsorFrequencyWords(workbook, WORKBOOK_NAME);
    if (!result.ok) {
      throw new Error(result.errors.map((item) => item.reason).join('\n'));
    }
    expect(result.frequencyWords.entries).toHaveLength(1);
  });
});

function expectDuplicateTierSheets(firstName: string, secondName: string): void {
  const result = readSponsorFrequencyWords(
    buildWorkbook({
      rows: [wordRow('alpha')],
      tierSheets: [
        { name: firstName, words: ['alpha'] },
        { name: secondName, words: ['alpha'] },
      ],
    }),
    WORKBOOK_NAME,
  );
  expect(result.ok).toBe(false);
  if (result.ok) {
    return;
  }
  expect(result.errors).toEqual([
    expect.objectContaining({
      severity: 'error',
      code: 'duplicate_tier_sheet',
      workbook: WORKBOOK_NAME,
      sheet: secondName,
      reason: `Worksheets "${firstName}" and "${secondName}" both represent frequency tier 1.`,
    }),
  ]);
}
