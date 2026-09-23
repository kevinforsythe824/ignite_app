/**
 * @jest-environment node
 */
import {
  CONTENT_SCHEMA_VERSION,
  SYNTHETIC_SEASON_END_DATE,
  SYNTHETIC_SEASON_NAME,
  SYNTHETIC_SEASON_START_DATE,
  SYNTHETIC_SOURCE_VERSION,
} from '../../scripts/content-pipeline/constants';
import { runPipelineFromWorkbooks } from '../../scripts/content-pipeline/pipeline';
import { buildAllSyntheticWorkbooks } from '../../scripts/content-pipeline/syntheticData';
import { cloneWorkbook } from '../../scripts/content-pipeline/testSupport';
import { validateSourceCollection } from '../../scripts/content-pipeline/validateSource';
import type { AuthoringWorkbookData, PackageRow } from '../../scripts/content-pipeline/types';

function matchingWorkbooks(): AuthoringWorkbookData[] {
  return buildAllSyntheticWorkbooks().map((workbook) => cloneWorkbook(workbook));
}

function beginnerPackage(
  workbooks: AuthoringWorkbookData[],
  patch: Partial<PackageRow>,
): AuthoringWorkbookData {
  const beginner = workbooks.find((workbook) => workbook.materialSet.materialSetId === 'beginner');
  if (!beginner) {
    throw new Error('expected beginner workbook');
  }
  beginner.package = { ...beginner.package, ...patch };
  return beginner;
}

describe('package metadata agreement', () => {
  it('accepts five matching Package rows', () => {
    expect(
      validateSourceCollection(matchingWorkbooks()).filter(
        (item) => item.code === 'package_field_mismatch',
      ),
    ).toEqual([]);
  });

  it('treats undefined, empty, and whitespace-only optional dates as absent', () => {
    const workbooks = matchingWorkbooks();
    workbooks[0]!.package = { ...workbooks[0]!.package, igniteAvailabilityDate: undefined };
    workbooks[1]!.package = { ...workbooks[1]!.package, igniteAvailabilityDate: '' };
    workbooks[2]!.package = { ...workbooks[2]!.package, igniteAvailabilityDate: '   ' };
    workbooks[3]!.package = {
      ...workbooks[3]!.package,
      sourceMaterialReleaseDate: undefined,
    };
    workbooks[4]!.package = { ...workbooks[4]!.package, sourceMaterialReleaseDate: '' };

    const result = runPipelineFromWorkbooks(workbooks);
    expect(result.status).toBe('passed');
    expect(
      result.report.errors.filter((item) => item.code === 'package_field_mismatch'),
    ).toEqual([]);
  });

  it.each([
    ['name', 'A Different Season', SYNTHETIC_SEASON_NAME],
    ['startDate', '2098-01-01', SYNTHETIC_SEASON_START_DATE],
    ['endDate', '2098-12-31', SYNTHETIC_SEASON_END_DATE],
    ['status', 'active', 'draft'],
    ['sourceVersion', 'other-version', SYNTHETIC_SOURCE_VERSION],
    ['schemaVersion', '9.9.9', CONTENT_SCHEMA_VERSION],
    ['sourceMaterialReleaseDate', '2098-06-01', '(absent)'],
    ['igniteAvailabilityDate', '2098-07-01', '(absent)'],
    ['seasonId', '2098', 'dev-synthetic-s3'],
  ] as const)(
    'fails before conversion when one workbook changes %s',
    (field, conflicting, expected) => {
      const workbooks = matchingWorkbooks();
      const beginner = beginnerPackage(workbooks, { [field]: conflicting });
      if (field === 'seasonId') {
        beginner.materialSet = { ...beginner.materialSet, seasonId: conflicting };
      }

      const result = runPipelineFromWorkbooks(workbooks);
      expect(result.status).toBe('failed');
      expect(result.content).toBeUndefined();

      const mismatch = result.report.errors.find(
        (item) => item.code === 'package_field_mismatch' && item.field === field,
      );
      expect(mismatch?.workbook).toBe(beginner.workbookName);
      expect(mismatch?.sheet).toBe('Package');
      expect(mismatch?.reason).toContain(`"${conflicting}"`);
      expect(mismatch?.reason).toContain(expected);
    },
  );
});
