import type { DivisionId } from '../../../../src/features/season/domain/division';
import type { MaterialSet } from '../../../../src/features/season/domain/materialSet';
import type { QuizzerSeasonParticipation } from '../../../../src/features/season/domain/quizzerSeasonParticipation';
import { resolveStudyMaterialSet } from '../../../../src/features/season/domain/resolveStudyMaterialSet';

function competitive(seasonId: string, divisionId: DivisionId): QuizzerSeasonParticipation {
  return {
    quizzerId: 'q1',
    seasonId,
    regionId: 'northwest',
    participationType: 'competitive',
    divisionId,
    readiness: 'ready',
  };
}

function studyTrack(seasonId: string, studyTrackMaterialSetId: string): QuizzerSeasonParticipation {
  return {
    quizzerId: 'q1',
    seasonId,
    regionId: 'northwest',
    participationType: 'studyTrack',
    studyTrackMaterialSetId,
    readiness: 'ready',
  };
}

function materialSet(
  overrides: Partial<MaterialSet> & Pick<MaterialSet, 'seasonId' | 'materialSetId' | 'divisionId'>,
): MaterialSet {
  return {
    displayName: overrides.materialSetId,
    ...overrides,
  };
}

describe('resolveStudyMaterialSet', () => {
  describe('competitive', () => {
    it('resolves the single same-season MaterialSet for the division', () => {
      const sets = [
        materialSet({
          seasonId: '2031',
          materialSetId: 'set-q-77',
          divisionId: 'junior',
        }),
        materialSet({
          seasonId: '2026',
          materialSetId: 'junior-2026',
          divisionId: 'junior',
        }),
      ];

      expect(resolveStudyMaterialSet(competitive('2031', 'junior'), sets)).toEqual({
        status: 'resolved',
        studyTarget: { seasonId: '2031', materialSetId: 'set-q-77' },
      });
    });

    it('fails closed when no same-season division match exists', () => {
      const sets = [
        materialSet({
          seasonId: '2027',
          materialSetId: 'junior-2027',
          divisionId: 'junior',
        }),
      ];
      expect(resolveStudyMaterialSet(competitive('2031', 'junior'), sets)).toEqual({
        status: 'none',
      });
    });

    it('fails closed as ambiguous when two same-season sets share the division', () => {
      const sets = [
        materialSet({ seasonId: '2031', materialSetId: 'set-a', divisionId: 'junior' }),
        materialSet({ seasonId: '2031', materialSetId: 'set-b', divisionId: 'junior' }),
      ];
      const result = resolveStudyMaterialSet(competitive('2031', 'junior'), sets);
      expect(result).toEqual({ status: 'ambiguous' });
      expect(result).not.toHaveProperty('studyTarget');
    });

    it('rejects a matching division from another season', () => {
      const sets = [
        materialSet({
          seasonId: '2034',
          materialSetId: 'other-season-junior',
          divisionId: 'junior',
        }),
      ];
      expect(resolveStudyMaterialSet(competitive('2031', 'junior'), sets)).toEqual({
        status: 'none',
      });
    });

    it('uses the stored materialSetId even when it is not division plus season', () => {
      const sets = [
        materialSet({
          seasonId: '2031',
          materialSetId: 'junior-2031',
          divisionId: 'experienced',
        }),
        materialSet({
          seasonId: '2027',
          materialSetId: 'junior-2027',
          divisionId: 'junior',
        }),
        materialSet({
          seasonId: '2031',
          materialSetId: 'custom-track-alpha',
          divisionId: 'junior',
        }),
      ];

      expect(resolveStudyMaterialSet(competitive('2031', 'junior'), sets)).toEqual({
        status: 'resolved',
        studyTarget: { seasonId: '2031', materialSetId: 'custom-track-alpha' },
      });
    });
  });

  describe('study track', () => {
    it('resolves a same-season MaterialSet by id without a study-track division', () => {
      const sets = [
        materialSet({
          seasonId: '2034',
          materialSetId: 'adult-notes',
          divisionId: 'intermediate',
          displayName: 'Intermediate material',
        }),
      ];
      expect(sets[0]?.divisionId).not.toBe('studyTrack');
      expect(resolveStudyMaterialSet(studyTrack('2034', 'adult-notes'), sets)).toEqual({
        status: 'resolved',
        studyTarget: { seasonId: '2034', materialSetId: 'adult-notes' },
      });
    });

    it('fails closed when the study-track MaterialSet id is missing', () => {
      const sets = [
        materialSet({
          seasonId: '2034',
          materialSetId: 'adult-notes',
          divisionId: 'beginner',
        }),
      ];
      expect(resolveStudyMaterialSet(studyTrack('2034', 'missing-set'), sets)).toEqual({
        status: 'none',
      });
    });

    it('fails closed when the only id match is in another season', () => {
      const sets = [
        materialSet({
          seasonId: '2026',
          materialSetId: 'adult-notes',
          divisionId: 'experienced',
        }),
      ];
      expect(resolveStudyMaterialSet(studyTrack('2034', 'adult-notes'), sets)).toEqual({
        status: 'none',
      });
    });

    it('fails closed as ambiguous when the same id appears twice in the season', () => {
      const sets = [
        materialSet({ seasonId: '2034', materialSetId: 'adult-notes', divisionId: 'cadet' }),
        materialSet({ seasonId: '2034', materialSetId: 'adult-notes', divisionId: 'junior' }),
      ];
      expect(resolveStudyMaterialSet(studyTrack('2034', 'adult-notes'), sets)).toEqual({
        status: 'ambiguous',
      });
    });
  });

  it('ignores a structurally invalid same-season row', () => {
    const valid = materialSet({
      seasonId: '2031',
      materialSetId: 'set-q-77',
      divisionId: 'junior',
    });
    const invalid = { ...valid, materialSetId: ' ', displayName: 'Broken' };
    expect(resolveStudyMaterialSet(competitive('2031', 'junior'), [invalid, valid])).toEqual({
      status: 'resolved',
      studyTarget: { seasonId: '2031', materialSetId: 'set-q-77' },
    });
  });
});
