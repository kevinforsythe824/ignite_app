import { readFileSync } from 'fs';
import { join } from 'path';

import { collection, getDocs } from 'firebase/firestore';

import { FirestoreSeasonCatalogRepository } from '../../../../src/features/season/repositories/firestoreSeasonCatalogRepository';
import { createFirebaseSeasonCatalogSource } from '../../../../src/features/season/repositories/firebaseSeasonCatalogSource';
import { SeasonLifecycleError } from '../../../../src/features/season/errors/seasonLifecycleError';

function seasonData(overrides: Record<string, unknown> = {}) {
  return {
    seasonId: '2032',
    name: '2032 Season',
    startDate: '2031-09-01',
    endDate: '2032-07-31',
    status: 'published',
    igniteAvailabilityDate: '2031-09-01',
    ...overrides,
  };
}

describe('FirestoreSeasonCatalogRepository', () => {
  it('returns domain Seasons from root documents', async () => {
    const repository = new FirestoreSeasonCatalogRepository({
      listSeasonSnapshots: async () => [
        {
          id: '2032',
          data: {
            ...seasonData(),
            provenance: { fingerprint: 'hidden' },
          },
        },
      ],
    });

    await expect(repository.listSeasons()).resolves.toEqual([
      {
        seasonId: '2032',
        name: '2032 Season',
        startDate: '2031-09-01',
        endDate: '2032-07-31',
        status: 'published',
        igniteAvailabilityDate: '2031-09-01',
      },
    ]);
  });

  it('translates permission-denied without a Firestore path', async () => {
    const repository = new FirestoreSeasonCatalogRepository({
      listSeasonSnapshots: async () => {
        throw { code: 'permission-denied' };
      },
    });

    await expect(repository.listSeasons()).rejects.toMatchObject({
      name: 'SeasonLifecycleError',
      code: 'permission-denied',
    });
    try {
      await repository.listSeasons();
    } catch (error) {
      expect(error).toBeInstanceOf(SeasonLifecycleError);
      expect((error as Error).message).not.toMatch(/firestore|seasons\//i);
    }
  });

  it('translates unavailable and deadline-exceeded as network unavailability', async () => {
    const unavailable = new FirestoreSeasonCatalogRepository({
      listSeasonSnapshots: async () => {
        throw { code: 'unavailable' };
      },
    });
    const deadline = new FirestoreSeasonCatalogRepository({
      listSeasonSnapshots: async () => {
        throw { code: 'deadline-exceeded' };
      },
    });

    await expect(unavailable.listSeasons()).rejects.toMatchObject({ code: 'unavailable' });
    await expect(deadline.listSeasons()).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('is read-only', () => {
    const repositorySource = readFileSync(
      join(
        __dirname,
        '../../../../src/features/season/repositories/firestoreSeasonCatalogRepository.ts',
      ),
      'utf8',
    );
    const firebaseSource = readFileSync(
      join(
        __dirname,
        '../../../../src/features/season/repositories/firebaseSeasonCatalogSource.ts',
      ),
      'utf8',
    );

    expect(repositorySource).toContain('listSeasons');
    expect(repositorySource).not.toMatch(/setDoc|updateDoc|deleteDoc|writeBatch|addDoc/);
    expect(firebaseSource).toContain('getDocs');
    expect(firebaseSource).not.toMatch(/setDoc|updateDoc|deleteDoc|writeBatch|addDoc/);
    expect(Object.keys(new FirestoreSeasonCatalogRepository({ listSeasonSnapshots: async () => [] }))).not.toEqual(
      expect.arrayContaining(['create', 'update', 'delete']),
    );
  });
});

describe('createFirebaseSeasonCatalogSource', () => {
  const fakeDb = { name: 'fake-db' };

  beforeEach(() => {
    (collection as jest.Mock).mockReset();
    (getDocs as jest.Mock).mockReset();
    (collection as jest.Mock).mockImplementation((...args: unknown[]) => ({ args }));
    (getDocs as jest.Mock).mockImplementation(async () => ({
      docs: [
        {
          id: '2032',
          data: () => seasonData(),
        },
      ],
    }));
  });

  it('reads only the seasons root collection', async () => {
    const source = createFirebaseSeasonCatalogSource(() => fakeDb as never);
    const snapshots = await source.listSeasonSnapshots();

    expect(collection).toHaveBeenCalledTimes(1);
    expect(collection).toHaveBeenCalledWith(fakeDb, 'seasons');
    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(snapshots).toEqual([{ id: '2032', data: seasonData() }]);

    const paths = (collection as jest.Mock).mock.calls.map((call) => call.slice(1).join('/'));
    expect(paths).toEqual(['seasons']);
    expect(
      paths.some((path) =>
        ['cards', 'sections', 'regions', 'materialSets', 'users'].some((segment) =>
          path.includes(segment),
        ),
      ),
    ).toBe(false);
  });
});
