import { collection, getDocs } from 'firebase/firestore';

import { createFirebaseSeasonSetupCatalogSource } from '../../../../src/features/season/repositories/firebaseSeasonSetupCatalogSource';

describe('createFirebaseSeasonSetupCatalogSource', () => {
  const fakeDb = { name: 'fake-db' };

  beforeEach(() => {
    (collection as jest.Mock).mockReset();
    (getDocs as jest.Mock).mockReset();
    (collection as jest.Mock).mockImplementation((...args: unknown[]) => ({ args }));
    (getDocs as jest.Mock).mockImplementation(async (ref: { args?: unknown[] }) => {
      const segments = ref.args?.slice(1) ?? [];
      return {
        docs: [
          {
            id: segments.includes('regions') ? 'northwest' : 'ms_opaque_77',
            data: () => ({ marker: segments[segments.length - 1] }),
          },
        ],
      };
    });
  });

  it('lists region and material set documents for one season and does not read cards', async () => {
    const source = createFirebaseSeasonSetupCatalogSource(() => fakeDb as never);
    const regions = await source.listRegionSnapshots('2032');
    const materialSets = await source.listMaterialSetSnapshots('2032');

    expect(collection).toHaveBeenCalledWith(fakeDb, 'seasons', '2032', 'regions');
    expect(collection).toHaveBeenCalledWith(fakeDb, 'seasons', '2032', 'materialSets');
    expect(regions).toEqual([{ id: 'northwest', data: { marker: 'regions' } }]);
    expect(materialSets).toEqual([{ id: 'ms_opaque_77', data: { marker: 'materialSets' } }]);

    const paths = (collection as jest.Mock).mock.calls.map((call) => call.slice(1).join('/'));
    expect(paths.some((path) => path.includes('cards') || path.includes('sections'))).toBe(false);
    expect(getDocs).toHaveBeenCalledTimes(2);
  });
});
