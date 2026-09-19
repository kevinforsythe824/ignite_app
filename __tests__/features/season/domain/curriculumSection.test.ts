import {
  assertCurriculumSectionInvariants,
  CurriculumSectionInvariantError,
  sortCurriculumSections,
  type CurriculumSection,
} from '../../../../src/features/season/domain/curriculumSection';

function section(
  overrides: Partial<CurriculumSection> & Pick<CurriculumSection, 'sectionId' | 'cardIds'>,
): CurriculumSection {
  return {
    seasonId: 's1',
    materialSetId: 'ms-1',
    title: overrides.sectionId,
    displayOrder: 0,
    ...overrides,
  };
}

describe('CurriculumSection invariants', () => {
  const materialSetCardIds = new Set(['c1', 'c2', 'c3']);

  it('accepts unique sections whose cardIds are in the MaterialSet', () => {
    expect(() =>
      assertCurriculumSectionInvariants(
        [
          section({ sectionId: 'a', displayOrder: 1, cardIds: ['c1', 'c2'] }),
          section({ sectionId: 'b', displayOrder: 2, cardIds: ['c3'] }),
        ],
        materialSetCardIds,
      ),
    ).not.toThrow();
  });

  it('rejects duplicate sectionId within a MaterialSet', () => {
    expect(() =>
      assertCurriculumSectionInvariants(
        [
          section({ sectionId: 'dup', cardIds: ['c1'] }),
          section({ sectionId: 'dup', cardIds: ['c2'] }),
        ],
        materialSetCardIds,
      ),
    ).toThrow(CurriculumSectionInvariantError);
  });

  it('rejects cardIds that are not in the MaterialSet', () => {
    expect(() =>
      assertCurriculumSectionInvariants(
        [section({ sectionId: 'a', cardIds: ['c1', 'missing'] })],
        materialSetCardIds,
      ),
    ).toThrow(/not in the MaterialSet/);
  });

  it('rejects duplicate cardIds inside one section', () => {
    expect(() =>
      assertCurriculumSectionInvariants(
        [section({ sectionId: 'a', cardIds: ['c1', 'c1'] })],
        materialSetCardIds,
      ),
    ).toThrow(/Duplicate cardId/);
  });

  it('sorts by displayOrder with sectionId as a stable tie-break', () => {
    const sorted = sortCurriculumSections([
      section({ sectionId: 'z', displayOrder: 2, cardIds: [] }),
      section({ sectionId: 'b', displayOrder: 1, cardIds: [] }),
      section({ sectionId: 'a', displayOrder: 1, cardIds: [] }),
    ]);

    expect(sorted.map((item) => item.sectionId)).toEqual(['a', 'b', 'z']);
  });
});
