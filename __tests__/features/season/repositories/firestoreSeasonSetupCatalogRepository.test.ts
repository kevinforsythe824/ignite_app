import { FirebaseNotConfiguredError } from '../../../../src/services/firebase';
import type { DivisionId } from '../../../../src/features/season/domain/division';
import { OFFICIAL_REGIONS } from '../../../../src/features/season/domain/officialRegions';
import {
  listActiveRegionsByDisplayOrder,
  type OfficialRegionConfig,
} from '../../../../src/features/season/domain/region';
import type { SeasonSetupCatalogDocumentSnapshot } from '../../../../src/features/season/data/mapSeasonSetupCatalogDocuments';
import { SeasonSetupCatalogError } from '../../../../src/features/season/errors/seasonSetupCatalogError';
import { FirestoreSeasonSetupCatalogRepository } from '../../../../src/features/season/repositories/firestoreSeasonSetupCatalogRepository';
import type { SeasonSetupCatalogFirestoreSource } from '../../../../src/features/season/repositories/seasonSetupCatalogRepository';

const SEASON_ID = '2032';

function regionSnapshots(
  regions: readonly OfficialRegionConfig[] = OFFICIAL_REGIONS,
): SeasonSetupCatalogDocumentSnapshot[] {
  return regions.map((region) => ({
    id: region.regionId,
    data: {
      regionId: region.regionId,
      displayName: region.displayName,
      coverageAreas: [...region.coverageAreas],
      displayOrder: region.displayOrder,
      active: region.active,
    },
  }));
}

function materialSnapshot(
  materialSetId: string,
  divisionId: DivisionId,
  seasonId = SEASON_ID,
  displayName = `${divisionId} notes`,
): SeasonSetupCatalogDocumentSnapshot {
  return {
    id: materialSetId,
    data: {
      seasonId,
      materialSetId,
      divisionId,
      displayName,
    },
  };
}

function sourceFor(
  regions: readonly SeasonSetupCatalogDocumentSnapshot[] | unknown,
  materialSets: readonly SeasonSetupCatalogDocumentSnapshot[] | unknown = [],
): SeasonSetupCatalogFirestoreSource {
  return {
    async listRegionSnapshots() {
      if (regions instanceof Error) {
        throw regions;
      }
      return regions as SeasonSetupCatalogDocumentSnapshot[];
    },
    async listMaterialSetSnapshots() {
      if (materialSets instanceof Error) {
        throw materialSets;
      }
      return materialSets as SeasonSetupCatalogDocumentSnapshot[];
    },
  };
}

function repositoryFor(
  regions: readonly SeasonSetupCatalogDocumentSnapshot[] | unknown,
  materialSets: readonly SeasonSetupCatalogDocumentSnapshot[] | unknown = [],
): FirestoreSeasonSetupCatalogRepository {
  return new FirestoreSeasonSetupCatalogRepository(sourceFor(regions, materialSets));
}

function repositoryThatThrows(error: unknown): FirestoreSeasonSetupCatalogRepository {
  return new FirestoreSeasonSetupCatalogRepository({
    async listRegionSnapshots() {
      throw error;
    },
    async listMaterialSetSnapshots() {
      throw error;
    },
  });
}

describe('FirestoreSeasonSetupCatalogRepository regions', () => {
  it('loads a valid official region catalog and keeps persisted active flags', async () => {
    const catalog = await repositoryFor(regionSnapshots()).loadCatalog(SEASON_ID);

    expect(catalog.seasonId).toBe(SEASON_ID);
    expect(catalog.regions.map((region) => region.regionId)).toEqual(
      OFFICIAL_REGIONS.map((region) => region.regionId),
    );
    expect(catalog.regions[0]).toMatchObject({
      regionId: 'western-canada',
      displayName: 'Western Canada',
      active: true,
    });
    expect(catalog.materialSets).toEqual([]);
  });

  it('orders active regions by displayOrder', async () => {
    const reversed = [...OFFICIAL_REGIONS].reverse();
    const catalog = await repositoryFor(regionSnapshots(reversed)).loadCatalog(SEASON_ID);
    const selectable = listActiveRegionsByDisplayOrder(catalog.regions);

    expect(selectable.map((region) => region.regionId)).toEqual(
      OFFICIAL_REGIONS.map((region) => region.regionId),
    );
    expect(selectable.map((region) => region.displayName)).not.toEqual(
      [...selectable.map((region) => region.displayName)].sort((left, right) =>
        left.localeCompare(right),
      ),
    );
  });

  it('keeps an inactive official region in the catalog and omits it from selection', async () => {
    const regions = OFFICIAL_REGIONS.map((region) =>
      region.regionId === 'southeast' ? { ...region, active: false } : region,
    );
    const catalog = await repositoryFor(regionSnapshots(regions)).loadCatalog(SEASON_ID);

    expect(catalog.regions.find((region) => region.regionId === 'southeast')?.active).toBe(false);
    expect(listActiveRegionsByDisplayOrder(catalog.regions).map((region) => region.regionId)).not.toContain(
      'southeast',
    );
    expect(listActiveRegionsByDisplayOrder(catalog.regions).map((region) => region.regionId)).toEqual(
      OFFICIAL_REGIONS.filter((region) => region.regionId !== 'southeast').map(
        (region) => region.regionId,
      ),
    );
  });

  it('fails the whole catalog when one region row is malformed', async () => {
    const snapshots = regionSnapshots();
    const first = snapshots[0];
    if (!first || typeof first.data !== 'object' || first.data === null) {
      throw new Error('expected a region snapshot');
    }
    snapshots[0] = {
      ...first,
      data: { ...first.data, displayName: 'Not the official name' },
    };

    await expect(repositoryFor(snapshots).loadCatalog(SEASON_ID)).rejects.toMatchObject({
      code: 'invalid-catalog',
    });
  });

  it('fails when a region document id is duplicated', async () => {
    const snapshots = regionSnapshots();
    const first = snapshots[0];
    if (!first) {
      throw new Error('expected a region snapshot');
    }
    await expect(repositoryFor([...snapshots, first]).loadCatalog(SEASON_ID)).rejects.toMatchObject({
      code: 'invalid-catalog',
    });
  });

  it('fails when an official region is missing', async () => {
    await expect(
      repositoryFor(regionSnapshots(OFFICIAL_REGIONS.slice(0, -1))).loadCatalog(SEASON_ID),
    ).rejects.toMatchObject({ code: 'invalid-catalog' });
  });

  it('fails when an unexpected region is present', async () => {
    const snapshots = [
      ...regionSnapshots(),
      {
        id: 'atlantis',
        data: {
          regionId: 'atlantis',
          displayName: 'Atlantis',
          coverageAreas: ['Ocean'],
          displayOrder: 9,
          active: true,
        },
      },
    ];

    await expect(repositoryFor(snapshots).loadCatalog(SEASON_ID)).rejects.toMatchObject({
      code: 'invalid-catalog',
    });
  });

  it('fails when the document id does not match the persisted regionId', async () => {
    const snapshots = regionSnapshots();
    const first = snapshots[0];
    if (!first) {
      throw new Error('expected a region snapshot');
    }
    snapshots[0] = { ...first, id: 'northwest' };

    await expect(repositoryFor(snapshots).loadCatalog(SEASON_ID)).rejects.toMatchObject({
      code: 'invalid-catalog',
    });
  });

  it('translates permission and unavailable errors without exposing the raw message', async () => {
    const denied = repositoryThatThrows({
      code: 'permission-denied',
      message: 'Missing or insufficient permissions for seasons/2032/regions/northwest.',
    });
    await expect(denied.loadCatalog(SEASON_ID)).rejects.toBeInstanceOf(SeasonSetupCatalogError);
    await expect(denied.loadCatalog(SEASON_ID)).rejects.toMatchObject({
      code: 'permission-denied',
      message: "Season setup isn't available right now.",
    });

    const unavailable = repositoryThatThrows({
      code: 'firestore/unavailable',
      message: 'backend timeout with document body',
    });
    await expect(unavailable.loadCatalog(SEASON_ID)).rejects.toMatchObject({
      code: 'unavailable',
    });

    const deadline = repositoryThatThrows({ code: 'deadline-exceeded', message: 'slow backend' });
    await expect(deadline.loadCatalog(SEASON_ID)).rejects.toMatchObject({ code: 'unavailable' });
  });
});

describe('FirestoreSeasonSetupCatalogRepository material sets', () => {
  const regions = regionSnapshots();

  it('maps valid material sets and preserves opaque ids', async () => {
    const catalog = await repositoryFor(regions, [
      materialSnapshot('ms_opaque_77', 'junior', SEASON_ID, 'Junior notes'),
      materialSnapshot('set-cadet-alpha', 'cadet'),
    ]).loadCatalog(SEASON_ID);

    expect(catalog.materialSets).toEqual([
      {
        seasonId: SEASON_ID,
        materialSetId: 'ms_opaque_77',
        divisionId: 'junior',
        displayName: 'Junior notes',
      },
      {
        seasonId: SEASON_ID,
        materialSetId: 'set-cadet-alpha',
        divisionId: 'cadet',
        displayName: 'cadet notes',
      },
    ]);
    expect(catalog.materialSets.map((materialSet) => materialSet.materialSetId).join(' ')).not.toMatch(
      /junior-\d{4}|cadet-\d{4}/,
    );
  });

  it('fails when the document seasonId does not match the requested season', async () => {
    await expect(
      repositoryFor(regions, [materialSnapshot('ms_opaque_77', 'junior', '2033')]).loadCatalog(
        SEASON_ID,
      ),
    ).rejects.toMatchObject({ code: 'invalid-catalog' });
  });

  it('fails when the path id does not match the persisted materialSetId', async () => {
    const snapshot = materialSnapshot('ms_opaque_77', 'junior');
    await expect(
      repositoryFor(regions, [{ ...snapshot, id: 'other-path-id' }]).loadCatalog(SEASON_ID),
    ).rejects.toMatchObject({ code: 'invalid-catalog' });
  });

  it('fails when the division is not official', async () => {
    const snapshot = materialSnapshot('ms_opaque_77', 'junior');
    const data = snapshot.data as Record<string, unknown>;
    await expect(
      repositoryFor(regions, [{ ...snapshot, data: { ...data, divisionId: 'senior' } }]).loadCatalog(
        SEASON_ID,
      ),
    ).rejects.toMatchObject({ code: 'invalid-catalog' });
  });

  it('fails when a material set id is duplicated', async () => {
    const snapshot = materialSnapshot('ms_opaque_77', 'junior');
    await expect(repositoryFor(regions, [snapshot, snapshot]).loadCatalog(SEASON_ID)).rejects.toMatchObject(
      { code: 'invalid-catalog' },
    );
  });

  it('fails when two material sets claim the same division', async () => {
    await expect(
      repositoryFor(regions, [
        materialSnapshot('ms_opaque_77', 'junior'),
        materialSnapshot('ms_other_88', 'junior', SEASON_ID, 'Other junior notes'),
      ]).loadCatalog(SEASON_ID),
    ).rejects.toMatchObject({ code: 'invalid-catalog' });
  });

  it('allows a structurally valid catalog that does not include every division', async () => {
    const catalog = await repositoryFor(regions, [
      materialSnapshot('ms_opaque_77', 'junior'),
    ]).loadCatalog(SEASON_ID);

    expect(catalog.materialSets).toHaveLength(1);
    expect(catalog.materialSets[0]?.materialSetId).toBe('ms_opaque_77');
  });

  it('translates material set persistence errors without the raw message', async () => {
    const denied = repositoryThatThrows({
      code: 'firestore/permission-denied',
      message: 'cannot read materialSets/ms_opaque_77',
    });
    await expect(denied.loadCatalog(SEASON_ID)).rejects.toMatchObject({
      code: 'permission-denied',
    });

    const unexpected = repositoryThatThrows(
      new FirebaseNotConfiguredError(['EXPO_PUBLIC_FIREBASE_API_KEY']),
    );
    await expect(unexpected.loadCatalog(SEASON_ID)).rejects.toMatchObject({
      code: 'unexpected',
      message: "Season setup isn't available right now.",
    });
  });
});
