import type { QuizzerProfile } from '../../../src/features/profile/domain/quizzerProfile';

describe('QuizzerProfile privacy contract', () => {
  it('is firstName / lastName / avatarId only — no region, division, age, or DOB', () => {
    const profile: QuizzerProfile = {
      quizzerId: 'q1',
      firstName: 'Pat',
      lastName: 'Quizzer',
      avatarId: null,
    };

    expect(Object.keys(profile).sort()).toEqual([
      'avatarId',
      'firstName',
      'lastName',
      'quizzerId',
    ]);
    expect(profile).not.toHaveProperty('divisionId');
    expect(profile).not.toHaveProperty('regionId');
    expect(profile).not.toHaveProperty('eligibilityAge');
    expect(profile).not.toHaveProperty('isFirstYearQuizzer');
    expect(profile).not.toHaveProperty('dateOfBirth');
    expect(profile).not.toHaveProperty('dob');
  });
});
