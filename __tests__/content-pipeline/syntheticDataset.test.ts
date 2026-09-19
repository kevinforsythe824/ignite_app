/**
 * @jest-environment node
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { OFFICIAL_DIVISION_IDS } from '../../src/features/season/domain/division';
import {
  DEFAULT_PACKAGE_ROOT,
  DEFAULT_SYNTHETIC_SOURCE_DIR,
  SYNTHETIC_DATASET_LABEL,
  SYNTHETIC_SEASON_ID,
} from '../../scripts/content-pipeline/constants';
import { loadWorkbooksFromPath, runPipelineFromWorkbooks } from '../../scripts/content-pipeline/pipeline';
import { buildAllSyntheticWorkbooks } from '../../scripts/content-pipeline/syntheticData';

describe('synthetic DEV dataset', () => {
  it('is labeled synthetic and is not official material', () => {
    for (const workbook of buildAllSyntheticWorkbooks()) {
      expect(workbook.package.name).toMatch(/NOT OFFICIAL/);
      expect(workbook.materialSet.displayName).toContain(SYNTHETIC_DATASET_LABEL);
      expect(workbook.package.seasonId).toBe(SYNTHETIC_SEASON_ID);
    }
  });

  it('covers all five official divisions as independent MaterialSets', () => {
    const ids = buildAllSyntheticWorkbooks().map((item) => item.materialSet.materialSetId);
    expect(ids).toEqual([...OFFICIAL_DIVISION_IDS]);
  });

  it('validates committed synthetic workbooks when they exist', async () => {
    const firstWorkbook = path.join(
      DEFAULT_SYNTHETIC_SOURCE_DIR,
      `${SYNTHETIC_SEASON_ID}-cadet.xlsx`,
    );
    if (!existsSync(firstWorkbook)) {
      return;
    }

    const loaded = await loadWorkbooksFromPath(DEFAULT_SYNTHETIC_SOURCE_DIR);
    expect(loaded.errors).toEqual([]);
    expect(loaded.workbooks).toHaveLength(5);

    const result = runPipelineFromWorkbooks(loaded.workbooks);
    expect(result.status).toBe('passed');
    expect(result.content?.season.seasonId).toBe(SYNTHETIC_SEASON_ID);
    expect(result.manifest?.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it('keeps generated package files out of the application domain', () => {
    expect(DEFAULT_PACKAGE_ROOT.startsWith('content/')).toBe(true);
    expect(DEFAULT_SYNTHETIC_SOURCE_DIR.startsWith('content/')).toBe(true);
  });
});
