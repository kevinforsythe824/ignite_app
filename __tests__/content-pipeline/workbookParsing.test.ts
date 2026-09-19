/**
 * @jest-environment node
 */
import ExcelJS from 'exceljs';
import { loadWorkbooksFromBuffers } from '../../scripts/content-pipeline/pipeline';
import { parseWorkbookBuffer } from '../../scripts/content-pipeline/workbookIo';
import { REQUIRED_WORKBOOK_SHEETS } from '../../scripts/content-pipeline/constants';
import { buildSyntheticWorkbook } from '../../scripts/content-pipeline/syntheticData';
import { cadetSource, workbookBufferFromData } from '../../scripts/content-pipeline/testSupport';

describe('workbook parsing', () => {
  it('round-trips a synthetic workbook through xlsx', async () => {
    const source = cadetSource();
    const buffer = await workbookBufferFromData(source, { synthetic: true });
    const parsed = await parseWorkbookBuffer(buffer, source.workbookName);

    expect(parsed.errors).toEqual([]);
    expect(parsed.data?.package.seasonId).toBe(source.package.seasonId);
    expect(parsed.data?.materialSet.materialSetId).toBe('cadet');
    expect(parsed.data?.cards).toHaveLength(source.cards.length);
    expect(parsed.data?.sections.map((section) => section.sectionId)).toEqual([
      'unit-1',
      'unit-2',
    ]);
    expect(parsed.data?.annotations[1]?.phrase).toBe('the word');
    expect(parsed.data?.annotations[1]?.occurrenceIndex).toBe(2);
  });

  it('requires the documented sheets', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Cards');
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const parsed = await parseWorkbookBuffer(buffer, 'incomplete.xlsx');

    const missingSheets = parsed.errors.filter((item) => item.code === 'missing_sheet');
    expect(missingSheets.length).toBeGreaterThan(0);
    expect(REQUIRED_WORKBOOK_SHEETS.every((name) => name === 'Cards' || missingSheets.some((item) => item.sheet === name))).toBe(
      true,
    );
  });

  it('loads a directory-equivalent set of buffers in MaterialSet order', async () => {
    const cadet = await workbookBufferFromData(buildSyntheticWorkbook('cadet'), {
      synthetic: true,
    });
    const beginner = await workbookBufferFromData(buildSyntheticWorkbook('beginner'), {
      synthetic: true,
    });
    const loaded = await loadWorkbooksFromBuffers([
      { name: 'beginner.xlsx', buffer: beginner },
      { name: 'cadet.xlsx', buffer: cadet },
    ]);

    expect(loaded.errors).toEqual([]);
    expect(loaded.workbooks.map((item) => item.materialSet.materialSetId)).toEqual([
      'beginner',
      'cadet',
    ]);
  });
});
