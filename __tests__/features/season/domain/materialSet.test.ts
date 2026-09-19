import type { MaterialSet } from '../../../../src/features/season/domain/materialSet';

describe('MaterialSet independence', () => {
  it('has no parentMaterialSetId — sets are not subsets of each other', () => {
    const cadet: MaterialSet = {
      seasonId: 's1',
      materialSetId: 'ms-cadet',
      divisionId: 'cadet',
      displayName: 'Cadet',
    };
    const experienced: MaterialSet = {
      seasonId: 's1',
      materialSetId: 'ms-experienced',
      divisionId: 'experienced',
      displayName: 'Experienced',
    };

    expect(cadet).not.toHaveProperty('parentMaterialSetId');
    expect(experienced).not.toHaveProperty('parentMaterialSetId');
    expect(Object.keys(cadet).sort()).toEqual([
      'displayName',
      'divisionId',
      'materialSetId',
      'seasonId',
    ]);
  });
});
