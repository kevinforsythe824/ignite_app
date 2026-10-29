/**
 * @jest-environment node
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { SPONSOR_FREQUENCY_COLUMNS, SPONSOR_FREQUENCY_SHEET } from '../../scripts/content-pipeline/sponsorFrequencyTypes';
import type { SponsorSourceProfile } from '../../scripts/content-pipeline/sponsorSourceProfile';
import { SPONSOR_VERSE_LIST_COLUMNS } from '../../scripts/content-pipeline/sponsorSourceTypes';
import {
  formatOfficialDraftValidationSummary,
  validateOfficialSponsorDraftInMemory,
} from '../../scripts/content-pipeline/validateOfficialDraft';

const SEASON_DATES = { startDate: '2027-01-01', endDate: '2027-08-31' } as const;
const RULES_VERSION = '1.0 (2026-07-29)';

async function writeTinyWorkbook(directory: string, fileName: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const summary = workbook.addWorksheet('Summary');
  summary.getCell('A1').value = 'Rules version';
  summary.getCell('B1').value = RULES_VERSION;
  const sheet = workbook.addWorksheet('Verse List');
  SPONSOR_VERSE_LIST_COLUMNS.forEach((header, index) => {
    sheet.getRow(1).getCell(index + 1).value = header;
  });
  const values: Record<string, ExcelJS.CellValue> = {
    Seq: 1,
    Section: 'Only Section',
    Topic: 'Topic',
    Reference: 'Sample 1:1',
    'Unique Beginning': 'Alpha',
    'Unique Ending': 'line',
    'Verse Text': 'Alpha  line;',
  };
  SPONSOR_VERSE_LIST_COLUMNS.forEach((header, index) => {
    const value = values[header];
    if (value !== undefined) {
      sheet.getRow(2).getCell(index + 1).value = value;
    }
  });
  const frequency = workbook.addWorksheet(SPONSOR_FREQUENCY_SHEET);
  SPONSOR_FREQUENCY_COLUMNS.forEach((header, index) => {
    frequency.getRow(1).getCell(index + 1).value = header;
  });
  frequency.getRow(2).getCell(1).value = 1;
  frequency.getRow(2).getCell(2).value = 'Alpha';
  frequency.getRow(2).getCell(3).value = 1;
  frequency.getRow(2).getCell(4).value = 1;
  frequency.getRow(2).getCell(6).value = 'Sample 1:1';
  const tier = workbook.addWorksheet('1x Words');
  tier.getRow(1).getCell(1).value = 'Word';
  tier.getRow(2).getCell(1).value = 'Alpha';
  await workbook.xlsx.writeFile(path.join(directory, fileName));
}

function fiveSetProfile(): SponsorSourceProfile {
  return {
    seasonId: '2027',
    sources: [
      {
        sourceId: 'cadet',
        fileName: 'cadet.xlsx',
        materialSets: [{ divisionId: 'cadet', materialSetId: 'cadet-2027' }],
      },
      {
        sourceId: 'beginner',
        fileName: 'beginner.xlsx',
        materialSets: [{ divisionId: 'beginner', materialSetId: 'beginner-2027' }],
      },
      {
        sourceId: 'junior',
        fileName: 'junior.xlsx',
        materialSets: [{ divisionId: 'junior', materialSetId: 'junior-2027' }],
      },
      {
        sourceId: 'senior',
        fileName: 'senior.xlsx',
        materialSets: [
          { divisionId: 'intermediate', materialSetId: 'intermediate-2027' },
          { divisionId: 'experienced', materialSetId: 'experienced-2027' },
        ],
      },
    ],
  };
}

describe('official draft validation workflow', () => {
  it('accepts an in-memory five-MaterialSet fixture and rejects an incomplete four-MaterialSet fixture', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-official-draft-'));
    try {
      await writeTinyWorkbook(directory, 'cadet.xlsx');
      await writeTinyWorkbook(directory, 'beginner.xlsx');
      await writeTinyWorkbook(directory, 'junior.xlsx');
      await writeTinyWorkbook(directory, 'senior.xlsx');

      const complete = await validateOfficialSponsorDraftInMemory({
        directory,
        profile: fiveSetProfile(),
        seasonDates: SEASON_DATES,
      });
      expect(complete.status).toBe('passed');
      expect(complete.workbookReadCount).toBe(4);
      expect(complete.materialSets.map((materialSet) => materialSet.materialSetId)).toEqual([
        'cadet-2027',
        'beginner-2027',
        'junior-2027',
        'intermediate-2027',
        'experienced-2027',
      ]);
      expect(complete.totalCards).toBe(5);
      expect(complete.totalAnnotations).toBe(15);
      expect(complete.serializationMatches).toBe(true);
      expect(complete.seasonStatus).toBe('draft');
      expect(complete.strictPackageErrors).toEqual([]);
      const printed = formatOfficialDraftValidationSummary(complete);
      expect(printed).toContain('Official draft validation: passed');
      expect(printed).toContain('does not import, activate, or publish');
      expect(printed).not.toContain('Alpha  line;');

      const incompleteProfile: SponsorSourceProfile = {
        seasonId: '2027',
        sources: fiveSetProfile().sources.filter((source) => source.sourceId !== 'cadet'),
      };
      const incomplete = await validateOfficialSponsorDraftInMemory({
        directory,
        profile: incompleteProfile,
        seasonDates: SEASON_DATES,
      });
      expect(incomplete.status).toBe('failed');
      expect(incomplete.workbookReadCount).toBe(3);
      expect(incomplete.materialSets).toHaveLength(4);
      expect(incomplete.strictPackageErrors.some((item) => item.code === 'material_set_count')).toBe(true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
