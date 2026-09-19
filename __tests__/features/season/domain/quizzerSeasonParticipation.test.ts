import {
  assertParticipationImmutableDuringActiveSeason,
  assertValidQuizzerSeasonParticipation,
  isValidQuizzerSeasonParticipation,
  ParticipationInvariantError,
  type QuizzerSeasonParticipation,
} from '../../../../src/features/season/domain/quizzerSeasonParticipation';

const competitive: QuizzerSeasonParticipation = {
  quizzerId: 'q1',
  seasonId: 's1',
  regionId: 'region-dev-1',
  participationType: 'competitive',
  divisionId: 'junior',
  readiness: 'ready',
};

const studyTrack: QuizzerSeasonParticipation = {
  quizzerId: 'q1',
  seasonId: 's1',
  regionId: 'region-dev-1',
  participationType: 'studyTrack',
  studyTrackMaterialSetId: 'ms-junior',
  readiness: 'ready',
};

describe('QuizzerSeasonParticipation XOR', () => {
  it('accepts competitive with divisionId and no study-track field', () => {
    expect(() => assertValidQuizzerSeasonParticipation(competitive)).not.toThrow();
    expect(isValidQuizzerSeasonParticipation(competitive)).toBe(true);
  });

  it('accepts studyTrack with materialSetId and no divisionId', () => {
    expect(() => assertValidQuizzerSeasonParticipation(studyTrack)).not.toThrow();
    expect(isValidQuizzerSeasonParticipation(studyTrack)).toBe(true);
  });

  it('rejects competitive that also has studyTrackMaterialSetId', () => {
    expect(() =>
      assertValidQuizzerSeasonParticipation({
        ...competitive,
        studyTrackMaterialSetId: 'ms-junior',
      }),
    ).toThrow(ParticipationInvariantError);
  });

  it('rejects studyTrack that also has divisionId', () => {
    expect(() =>
      assertValidQuizzerSeasonParticipation({
        ...studyTrack,
        divisionId: 'junior',
      }),
    ).toThrow(/must not include divisionId/);
  });

  it('rejects competitive without a valid divisionId', () => {
    const { divisionId: _divisionId, ...missing } = competitive;
    expect(() => assertValidQuizzerSeasonParticipation(missing)).toThrow(/divisionId/);
    expect(() =>
      assertValidQuizzerSeasonParticipation({ ...competitive, divisionId: 'senior' }),
    ).toThrow(/divisionId/);
  });

  it('does not persist eligibility inputs on the durable record', () => {
    expect(() =>
      assertValidQuizzerSeasonParticipation({
        ...competitive,
        eligibilityAge: 11,
      }),
    ).toThrow(/Eligibility inputs/);
    expect(() =>
      assertValidQuizzerSeasonParticipation({
        ...competitive,
        isFirstYearQuizzer: true,
      }),
    ).toThrow(/Eligibility inputs/);
    expect(() =>
      assertValidQuizzerSeasonParticipation({
        ...competitive,
        dateOfBirth: '2015-01-01',
      }),
    ).toThrow(/Eligibility inputs/);
  });
});

describe('assertParticipationImmutableDuringActiveSeason', () => {
  it('allows placement changes while the season is still published', () => {
    expect(() =>
      assertParticipationImmutableDuringActiveSeason(competitive, {
        ...competitive,
        divisionId: 'intermediate',
      }, 'published'),
    ).not.toThrow();
  });

  it('blocks division change once Active/Locked', () => {
    expect(() =>
      assertParticipationImmutableDuringActiveSeason(competitive, {
        ...competitive,
        divisionId: 'intermediate',
      }, 'activeLocked'),
    ).toThrow(/Division cannot change/);
  });

  it('blocks Study Track change once archived', () => {
    expect(() =>
      assertParticipationImmutableDuringActiveSeason(studyTrack, {
        ...studyTrack,
        studyTrackMaterialSetId: 'ms-experienced',
      }, 'archived'),
    ).toThrow(/Study Track cannot change/);
  });
});
