import { readFileSync } from 'fs';
import { join } from 'path';

import { collection, getDocs } from 'firebase/firestore';

import { SeasonLifecycleError } from '../../../../src/features/season/errors/seasonLifecycleError';
import { createFirebaseSeasonMaterialSetCatalogSource } from '../../../../src/features/season/repositories/firebaseSeasonMaterialSetCatalogSource';
import { FirestoreSeasonMaterialSetCatalogRepository } from '../../../../src/features/season/repositories/firestoreSeasonMaterialSetCatalogRepository';

function materialSetSnapshot(
  seasonId: string,
  materialSetId: string,
  divisionId: string,
) {
  return {
    id: materialSetId,
    data: {
      seasonId,
      materialSetId,
      divisionId,
      displayName: 'Junior',
    },
  };
}

describe('FirestoreSeasonMaterialSetCatalogRepository', () => {
  it('maps one Season MaterialSet and keeps the persisted id', async () => {
    const repository = new FirestoreSeasonMaterialSetCatalogRepository({
      listMaterialSetSnapshots: async () => [
        materialSetSnapshot('2032', 'material-junior', 'junior'),
      ],
    });

    await expect(repository.listMaterialSets('2032')).resolves.toEqual([
      {
        seasonId: '2032',
        materialSetId: 'material-junior',
        divisionId: 'junior',
        displayName: 'Junior',
      },
    ]);
  });

  it('rejects a MaterialSet whose persisted seasonId is a different Season', async () => {
    const repository = new FirestoreSeasonMaterialSetCatalogRepository({
      listMaterialSetSnapshots: async () => [
        materialSetSnapshot('2031', 'material-junior', 'junior'),
      ],
    });

    await expect(repository.listMaterialSets('2032')).rejects.toBeInstanceOf(SeasonLifecycleError);
    await expect(repository.listMaterialSets('2032')).rejects.toMatchObject({
      code: 'invalid-material-set',
    });
  });

  it('rejects duplicate competitive MaterialSets for one division', async () => {
    const repository = new FirestoreSeasonMaterialSetCatalogRepository({
      listMaterialSetSnapshots: async () => [
        materialSetSnapshot('2032', 'material-junior-a', 'junior'),
        {
          id: 'material-junior-b',
          data: {
            seasonId: '2032',
            materialSetId: 'material-junior-b',
            divisionId: 'junior',
            displayName: 'Junior copy',
          },
        },
      ],
    });

    await expect(repository.listMaterialSets('2032')).rejects.toMatchObject({
      code: 'invalid-material-set',
    });
  });

  it('translates permission and network failures', async () => {
    const denied = new FirestoreSeasonMaterialSetCatalogRepository({
      listMaterialSetSnapshots: async () => {
        throw { code: 'permission-denied' };
      },
    });
    const offline = new FirestoreSeasonMaterialSetCatalogRepository({
      listMaterialSetSnapshots: async () => {
        throw { code: 'unavailable' };
      },
    });

    await expect(denied.listMaterialSets('2032')).rejects.toMatchObject({
      code: 'permission-denied',
    });
    await expect(offline.listMaterialSets('2032')).rejects.toMatchObject({
      code: 'unavailable',
    });
  });

  it('is read-only', () => {
    const source = readFileSync(
      join(
        __dirname,
        '../../../../src/features/season/repositories/firebaseSeasonMaterialSetCatalogSource.ts',
      ),
      'utf8',
    );
    expect(source).toContain('getDocs');
    expect(source).not.toMatch(/setDoc|updateDoc|deleteDoc|writeBatch|addDoc/);
  });
});

describe('createFirebaseSeasonMaterialSetCatalogSource', () => {
  const fakeDb = { name: 'fake-db' };

  beforeEach(() => {
    (collection as jest.Mock).mockReset();
    (getDocs as jest.Mock).mockReset();
    (collection as jest.Mock).mockImplementation((...args: unknown[]) => ({ args }));
    (getDocs as jest.Mock).mockImplementation(async () => ({
      docs: [
        {
          id: 'material-junior',
          data: () => materialSetSnapshot('2032', 'material-junior', 'junior').data,
        },
      ],
    }));
  });

  it('reads only materialSets for the requested Season', async () => {
    const source = createFirebaseSeasonMaterialSetCatalogSource(() => fakeDb as never);
    const snapshots = await source.listMaterialSetSnapshots('2032');

    expect(collection).toHaveBeenCalledWith(fakeDb, 'seasons', '2032', 'materialSets');
    expect(snapshots).toEqual([
      {
        id: 'material-junior',
        data: materialSetSnapshot('2032', 'material-junior', 'junior').data,
      },
    ]);
    const paths = (collection as jest.Mock).mock.calls.map((call) => call.slice(1).join('/'));
    expect(paths.some((path) => path.includes('cards') || path.includes('sections') || path.includes('regions'))).toBe(
      false,
    );
  });
});
