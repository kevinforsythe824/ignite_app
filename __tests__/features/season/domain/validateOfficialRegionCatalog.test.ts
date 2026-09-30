import { OFFICIAL_REGIONS } from '../../../../src/features/season/domain/officialRegions';
import type { OfficialRegionConfig } from '../../../../src/features/season/domain/region';
import { validateOfficialRegionCatalog } from '../../../../src/features/season/domain/validateOfficialRegionCatalog';

function cloneOfficial(): OfficialRegionConfig[] {
  return OFFICIAL_REGIONS.map((region) => ({
    regionId: region.regionId,
    displayName: region.displayName,
    coverageAreas: [...region.coverageAreas],
    displayOrder: region.displayOrder,
    active: region.active,
  }));
}

describe('validateOfficialRegionCatalog', () => {
  it('accepts the official catalog, including a valid inactive expected region', () => {
    const valid = validateOfficialRegionCatalog(OFFICIAL_REGIONS);
    expect(valid.status).toBe('valid');
    if (valid.status === 'valid') {
      expect(valid.regions.map((region) => region.regionId)).toEqual(
        OFFICIAL_REGIONS.map((region) => region.regionId),
      );
    }

    const withInactive = cloneOfficial().map((region) =>
      region.regionId === 'northwest' ? { ...region, active: false } : region,
    );
    const inactiveResult = validateOfficialRegionCatalog(withInactive);
    expect(inactiveResult.status).toBe('valid');
    if (inactiveResult.status === 'valid') {
      expect(inactiveResult.regions).toHaveLength(OFFICIAL_REGIONS.length);
      expect(
        inactiveResult.regions.find((region) => region.regionId === 'northwest')?.active,
      ).toBe(false);
    }
  });

  it('fails closed on a malformed row instead of returning a shorter list', () => {
    const records = cloneOfficial();
    records[0] = { ...records[0]!, leadershipContact: 'not-stored' } as OfficialRegionConfig;
    expect(validateOfficialRegionCatalog(records)).toEqual({
      status: 'invalid',
      reason: 'malformed',
    });
    expect(validateOfficialRegionCatalog(null)).toEqual({
      status: 'invalid',
      reason: 'malformed',
    });
    const blankCoverage = cloneOfficial();
    blankCoverage[2] = {
      ...blankCoverage[2]!,
      coverageAreas: ['California', ' '],
    };
    expect(validateOfficialRegionCatalog(blankCoverage)).toEqual({
      status: 'invalid',
      reason: 'malformed',
    });
  });

  it('detects a missing expected region, an unexpected id, and duplicates', () => {
    const missing = cloneOfficial().filter((region) => region.regionId !== 'southeast');
    expect(validateOfficialRegionCatalog(missing)).toEqual({
      status: 'invalid',
      reason: 'missingRegion',
    });

    const unexpected = cloneOfficial();
    unexpected.push({
      regionId: 'dev-test-region',
      displayName: 'DEV Test Region',
      coverageAreas: ['Nowhere'],
      displayOrder: 9,
      active: true,
    });
    expect(validateOfficialRegionCatalog(unexpected)).toEqual({
      status: 'invalid',
      reason: 'unexpectedRegion',
    });

    const duplicateId = cloneOfficial();
    duplicateId.push({ ...duplicateId[1]! });
    expect(validateOfficialRegionCatalog(duplicateId)).toEqual({
      status: 'invalid',
      reason: 'duplicateRegionId',
    });
  });

  it('detects duplicate and incorrect display order', () => {
    const duplicateOrder = cloneOfficial().map((region) =>
      region.regionId === 'southeast' ? { ...region, displayOrder: 7 } : region,
    );
    expect(validateOfficialRegionCatalog(duplicateOrder)).toEqual({
      status: 'invalid',
      reason: 'duplicateDisplayOrder',
    });

    const swapped = cloneOfficial().map((region) => {
      if (region.regionId === 'northwest') {
        return { ...region, displayOrder: 3 };
      }
      if (region.regionId === 'southwest') {
        return { ...region, displayOrder: 2 };
      }
      return region;
    });
    expect(validateOfficialRegionCatalog(swapped)).toEqual({
      status: 'invalid',
      reason: 'incorrectOrder',
    });
  });

  it('rejects an official id whose display name or coverage does not match', () => {
    const renamed = cloneOfficial().map((region) =>
      region.regionId === 'central' ? { ...region, displayName: 'Middle' } : region,
    );
    expect(validateOfficialRegionCatalog(renamed)).toEqual({
      status: 'invalid',
      reason: 'malformed',
    });
  });
});
