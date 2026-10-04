import { mapSeasonCatalogDocuments } from '../../../../src/features/season/data/mapSeasonCatalogDocuments';
import { SeasonLifecycleError } from '../../../../src/features/season/errors/seasonLifecycleError';

function seasonData(overrides: Record<string, unknown> = {}) {
  return {
    seasonId: '2032',
    name: '2032 Season',
    startDate: '2031-09-01',
    endDate: '2032-07-31',
    status: 'published',
    sourceMaterialReleaseDate: '2031-08-01',
    igniteAvailabilityDate: '2031-09-01',
    provenance: {
      fingerprint: 'not-domain-data',
      importedAt: '2031-08-02T00:00:00.000Z',
    },
    ...overrides,
  };
}

describe('mapSeasonCatalogDocuments', () => {
  it('maps a valid Season document and drops persistence provenance', () => {
    const [season] = mapSeasonCatalogDocuments([
      { id: '2032', data: seasonData() },
    ]);

    expect(season).toEqual({
      seasonId: '2032',
      name: '2032 Season',
      startDate: '2031-09-01',
      endDate: '2032-07-31',
      status: 'published',
      sourceMaterialReleaseDate: '2031-08-01',
      igniteAvailabilityDate: '2031-09-01',
    });
    expect(season).not.toHaveProperty('provenance');
    expect(JSON.stringify(season)).not.toContain('not-domain-data');
  });

  it('requires the document id to equal seasonId', () => {
    expect(() =>
      mapSeasonCatalogDocuments([{ id: '2033', data: seasonData({ seasonId: '2032' }) }]),
    ).toThrow(SeasonLifecycleError);
    try {
      mapSeasonCatalogDocuments([{ id: '2033', data: seasonData() }]);
    } catch (error) {
      expect(error).toBeInstanceOf(SeasonLifecycleError);
      expect((error as SeasonLifecycleError).code).toBe('invalid-season-catalog');
    }
  });

  it('fails the catalog when a required field is malformed', () => {
    expect(() =>
      mapSeasonCatalogDocuments([{ id: '2032', data: seasonData({ name: '  2032' }) }]),
    ).toThrow(SeasonLifecycleError);
    expect(() =>
      mapSeasonCatalogDocuments([{ id: '2032', data: seasonData({ startDate: '09/01/2031' }) }]),
    ).toThrow(SeasonLifecycleError);
  });

  it('fails the catalog when status is not a Season status', () => {
    expect(() =>
      mapSeasonCatalogDocuments([{ id: '2032', data: seasonData({ status: 'live' }) }]),
    ).toThrow(SeasonLifecycleError);
  });

  it('does not return a later valid row after an earlier malformed row', () => {
    expect(() =>
      mapSeasonCatalogDocuments([
        { id: '2032', data: seasonData({ status: 'live' }) },
        { id: '2033', data: seasonData({ seasonId: '2033', name: 'Next' }) },
      ]),
    ).toThrow(SeasonLifecycleError);
  });
});
