/**
 * @jest-environment node
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ContentImportPackageError, loadValidatedContentPackage } from '../../scripts/content-import/loadPackage';
import { fingerprintContent, stablePrettyJson } from '../../scripts/content-pipeline/fingerprint';
import { convertWorkbooksToPackage } from '../../scripts/content-pipeline/convert';
import { buildAllSyntheticWorkbooks } from '../../scripts/content-pipeline/syntheticData';
import type { ContentPackage } from '../../scripts/content-pipeline/types';
import { validateContentPackage } from '../../scripts/content-pipeline/validatePackage';

function fourSetOfficialPackage(): ContentPackage {
  const converted = convertWorkbooksToPackage(buildAllSyntheticWorkbooks());
  if (!converted.content) {
    throw new Error(converted.errors.map((item) => item.reason).join('\n'));
  }
  const content = converted.content;
  content.schemaVersion = '1.1.0';
  for (const materialSet of content.materialSets) {
    for (const card of materialSet.cards) {
      for (const annotation of card.annotations) {
        if (annotation.type === 'frequency') {
          annotation.frequencyTier = 3;
        }
      }
    }
  }
  content.materialSets = content.materialSets.filter((materialSet) => materialSet.divisionId !== 'cadet');
  return content;
}

describe('four-MaterialSet import boundary', () => {
  it('rejects a schema 1.1.0 four-set package on the default validator and the import loader', async () => {
    const content = fourSetOfficialPackage();
    expect(content.materialSets).toHaveLength(4);
    expect(content.schemaVersion).toBe('1.1.0');

    const relaxed = validateContentPackage(content, { requireAllOfficialDivisions: false });
    expect(relaxed).toEqual([]);

    const strict = validateContentPackage(content);
    expect(strict.some((item) => item.code === 'material_set_count')).toBe(true);
    expect(strict.some((item) => item.reason.includes('exactly 5 independent MaterialSets'))).toBe(true);

    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-four-set-'));
    try {
      const fingerprint = fingerprintContent(content);
      await writeFile(path.join(directory, 'content.json'), stablePrettyJson(content), 'utf8');
      await writeFile(
        path.join(directory, 'manifest.json'),
        stablePrettyJson({
          schemaVersion: content.schemaVersion,
          seasonId: content.season.seasonId,
          sourceVersion: content.sourceVersion,
          converterVersion: 'test',
          materialSets: [],
          cardCounts: { total: 0, byMaterialSet: {} },
          fingerprint,
          validationStatus: 'passed',
          generatedAt: '2026-01-01T00:00:00.000Z',
        }),
        'utf8',
      );

      await expect(loadValidatedContentPackage(directory)).rejects.toBeInstanceOf(ContentImportPackageError);
      await expect(loadValidatedContentPackage(directory)).rejects.toThrow(
        /exactly 5 independent MaterialSets/,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
