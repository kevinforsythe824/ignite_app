import { OFFICIAL_REGIONS } from '../../src/features/season/domain/officialRegions';
import type { OfficialRegionConfig } from '../../src/features/season/domain/region';
import { IGNITE_FIREBASE_PROJECTS } from '../../src/services/firebase/firebaseEnvironments';

import { assertDevRegionConfigurationTarget } from '../../scripts/region-config/assertDevRegionConfigurationTarget';
import {
  applyOfficialRegionConfigurationPlan,
  planOfficialRegionConfiguration,
  type RegionDocumentWriter,
} from '../../scripts/region-config/planOfficialRegionConfiguration';

function cloneOfficial(): OfficialRegionConfig[] {
  return OFFICIAL_REGIONS.map((region) => ({
    regionId: region.regionId,
    displayName: region.displayName,
    coverageAreas: [...region.coverageAreas],
    displayOrder: region.displayOrder,
    active: region.active,
  }));
}

function existingFrom(regions: readonly OfficialRegionConfig[]) {
  return regions.map((region) => ({
    regionId: region.regionId,
    data: {
      regionId: region.regionId,
      displayName: region.displayName,
      coverageAreas: [...region.coverageAreas],
      displayOrder: region.displayOrder,
      active: region.active,
    },
  }));
}

const DEV_ENV = {
  EXPO_PUBLIC_IGNITE_ENV: 'dev',
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.dev,
};

describe('official region configuration planner', () => {
  it('maps every official region onto a stable season path', () => {
    const plan = planOfficialRegionConfiguration({ seasonId: '2034', existing: [] });
    expect(plan.writes.map((write) => write.regionId)).toEqual(
      OFFICIAL_REGIONS.map((region) => region.regionId),
    );
    expect(plan.writes.every((write) => write.action === 'create')).toBe(true);
    for (const write of plan.writes) {
      const official = OFFICIAL_REGIONS.find((region) => region.regionId === write.regionId);
      expect(write.path).toBe(`seasons/2034/regions/${write.regionId}`);
      expect(write.document.displayName).toBe(official?.displayName);
      expect(write.document.coverageAreas).toEqual(official?.coverageAreas);
      expect(write.document.displayOrder).toBe(official?.displayOrder);
      expect(write.document.active).toBe(true);
    }
    expect(plan.untouchedUnknownRegionIds).toEqual([]);
  });

  it('reports a second run as unchanged and does not delete unknown documents', async () => {
    const first = planOfficialRegionConfiguration({ seasonId: '2034', existing: [] });
    const writer: RegionDocumentWriter & { sets: { path: string }[] } = {
      sets: [],
      async set(path) {
        this.sets.push({ path });
      },
    };
    await applyOfficialRegionConfigurationPlan(first, writer);
    expect(writer.sets).toHaveLength(OFFICIAL_REGIONS.length);
    expect(writer.sets.every((entry) => entry.path.startsWith('seasons/2034/regions/'))).toBe(
      true,
    );

    const second = planOfficialRegionConfiguration({
      seasonId: '2034',
      existing: [
        ...existingFrom(cloneOfficial()),
        { regionId: 'dev-test-region', data: { regionId: 'dev-test-region' } },
      ],
    });
    expect(second.writes.every((write) => write.action === 'unchanged')).toBe(true);
    expect(second.untouchedUnknownRegionIds).toEqual(['dev-test-region']);
    const secondWriter: RegionDocumentWriter & { sets: string[] } = {
      sets: [],
      async set(path) {
        this.sets.push(path);
      },
    };
    await applyOfficialRegionConfigurationPlan(second, secondWriter);
    expect(secondWriter.sets).toEqual([]);
  });

  it('plans an update when an official document differs', () => {
    const existing = existingFrom(cloneOfficial());
    existing[1] = {
      regionId: 'northwest',
      data: { ...existing[1]!.data, displayName: 'Old Northwest' },
    };
    const plan = planOfficialRegionConfiguration({ seasonId: '2040', existing });
    expect(plan.writes.find((write) => write.regionId === 'northwest')?.action).toBe('update');
    expect(plan.writes.find((write) => write.regionId === 'southwest')?.action).toBe(
      'unchanged',
    );
    expect(plan.writes.find((write) => write.regionId === 'northwest')?.document.displayName).toBe(
      'Northwest',
    );
  });

  it('fails before write planning when the catalog is incomplete, duplicated, or malformed', () => {
    const writer = jest.fn();
    expect(() =>
      planOfficialRegionConfiguration({
        seasonId: '2034',
        catalog: cloneOfficial().filter((region) => region.regionId !== 'southeast'),
      }),
    ).toThrow(/missingRegion/);
    expect(() =>
      planOfficialRegionConfiguration({
        seasonId: '2034',
        catalog: [...cloneOfficial(), cloneOfficial()[0]!],
      }),
    ).toThrow(/duplicateRegionId/);
    const malformed = cloneOfficial();
    malformed[0] = { ...malformed[0]!, contact: 'nope' } as OfficialRegionConfig;
    expect(() =>
      planOfficialRegionConfiguration({ seasonId: '2034', catalog: malformed }),
    ).toThrow(/malformed/);
    expect(writer).not.toHaveBeenCalled();
  });

  it('permits DEV and refuses STAGING, PROD, and an unknown environment', () => {
    expect(assertDevRegionConfigurationTarget(DEV_ENV)).toEqual({
      environment: 'dev',
      projectId: IGNITE_FIREBASE_PROJECTS.dev,
    });
    expect(() =>
      assertDevRegionConfigurationTarget({
        EXPO_PUBLIC_IGNITE_ENV: 'prod',
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.prod,
      }),
    ).toThrow(/production/);
    expect(() =>
      assertDevRegionConfigurationTarget({
        EXPO_PUBLIC_IGNITE_ENV: 'staging',
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.staging,
      }),
    ).toThrow(/staging/);
    expect(() =>
      assertDevRegionConfigurationTarget({
        EXPO_PUBLIC_IGNITE_ENV: 'qa',
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.dev,
      }),
    ).toThrow(/Invalid|qa/);
    expect(() => assertDevRegionConfigurationTarget({})).toThrow(/Missing/);
  });

  it('does not target curriculum package paths', () => {
    const plan = planOfficialRegionConfiguration({ seasonId: '2034' });
    expect(plan.writes.every((write) => /^seasons\/2034\/regions\/[^/]+$/.test(write.path))).toBe(
      true,
    );
    expect(JSON.stringify(plan)).not.toContain('materialSets');
    expect(JSON.stringify(plan)).not.toContain('content-package');
  });
});
