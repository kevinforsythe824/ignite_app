import { OFFICIAL_DIVISION_IDS } from '../../../../../src/features/season/domain/division';
import { resolveParticipationOptions } from '../../../../../src/features/season/domain/eligibility/resolveParticipationOptions';

describe('resolveParticipationOptions', () => {
  it.each([
    { age: -1, expected: { status: 'invalid', reason: 'ineligibleAge' } },
    { age: 1, expected: { status: 'invalid', reason: 'ineligibleAge' } },
    {
      age: 2,
      expected: {
        status: 'eligible',
        participationType: 'competitive',
        allowedDivisionIds: ['cadet', 'beginner', 'junior'],
      },
    },
    {
      age: 4,
      expected: {
        status: 'eligible',
        participationType: 'competitive',
        allowedDivisionIds: ['cadet', 'beginner', 'junior'],
      },
    },
    {
      age: 5,
      expected: {
        status: 'eligible',
        participationType: 'competitive',
        allowedDivisionIds: ['cadet', 'beginner', 'junior'],
      },
    },
    {
      age: 6,
      expected: {
        status: 'eligible',
        participationType: 'competitive',
        allowedDivisionIds: ['beginner', 'junior'],
      },
    },
    {
      age: 8,
      expected: {
        status: 'eligible',
        participationType: 'competitive',
        allowedDivisionIds: ['beginner', 'junior'],
      },
    },
    {
      age: 9,
      expected: {
        status: 'eligible',
        participationType: 'competitive',
        allowedDivisionIds: ['junior'],
      },
    },
    {
      age: 11,
      expected: {
        status: 'eligible',
        participationType: 'competitive',
        allowedDivisionIds: ['junior'],
      },
    },
    {
      age: 12,
      expected: {
        status: 'eligible',
        participationType: 'competitive',
        allowedDivisionIds: ['intermediate', 'experienced'],
      },
    },
    {
      age: 14,
      expected: {
        status: 'eligible',
        participationType: 'competitive',
        allowedDivisionIds: ['intermediate', 'experienced'],
      },
    },
  ])('age $age', ({ age, expected }) => {
    expect(resolveParticipationOptions({ eligibilityAge: age })).toEqual(expected);
  });

  it('ages 12 and 14 ignore the first-year flag and still allow Intermediate and Experienced', () => {
    for (const age of [12, 14]) {
      expect(
        resolveParticipationOptions({ eligibilityAge: age, isFirstYearQuizzer: true }),
      ).toEqual({
        status: 'eligible',
        participationType: 'competitive',
        allowedDivisionIds: ['intermediate', 'experienced'],
      });
      expect(
        resolveParticipationOptions({ eligibilityAge: age, isFirstYearQuizzer: false }),
      ).toEqual({
        status: 'eligible',
        participationType: 'competitive',
        allowedDivisionIds: ['intermediate', 'experienced'],
      });
    }
  });

  it('ages 15 and 18 first-year allow Intermediate and Experienced', () => {
    for (const age of [15, 18]) {
      expect(
        resolveParticipationOptions({ eligibilityAge: age, isFirstYearQuizzer: true }),
      ).toEqual({
        status: 'eligible',
        participationType: 'competitive',
        allowedDivisionIds: ['intermediate', 'experienced'],
      });
    }
  });

  it('ages 15 and 18 returning allow Experienced only', () => {
    for (const age of [15, 18]) {
      expect(
        resolveParticipationOptions({ eligibilityAge: age, isFirstYearQuizzer: false }),
      ).toEqual({
        status: 'eligible',
        participationType: 'competitive',
        allowedDivisionIds: ['experienced'],
      });
    }
  });

  it('ages 15 and 18 without first-year are invalid', () => {
    expect(resolveParticipationOptions({ eligibilityAge: 15 })).toEqual({
      status: 'invalid',
      reason: 'firstYearRequired',
    });
    expect(resolveParticipationOptions({ eligibilityAge: 18 })).toEqual({
      status: 'invalid',
      reason: 'firstYearRequired',
    });
  });

  it('age 19+ is Study Track with all five official divisions and no max cap', () => {
    expect(resolveParticipationOptions({ eligibilityAge: 19 })).toEqual({
      status: 'eligible',
      participationType: 'studyTrack',
      allowedDivisionIds: OFFICIAL_DIVISION_IDS,
    });
    expect(resolveParticipationOptions({ eligibilityAge: 40 })).toEqual({
      status: 'eligible',
      participationType: 'studyTrack',
      allowedDivisionIds: OFFICIAL_DIVISION_IDS,
    });
    expect(resolveParticipationOptions({ eligibilityAge: 80 })).toEqual({
      status: 'eligible',
      participationType: 'studyTrack',
      allowedDivisionIds: OFFICIAL_DIVISION_IDS,
    });
  });

  it('rejects non-integer and non-finite ages', () => {
    expect(resolveParticipationOptions({ eligibilityAge: 2.5 })).toEqual({
      status: 'invalid',
      reason: 'nonIntegerAge',
    });
    expect(resolveParticipationOptions({ eligibilityAge: Number.NaN })).toEqual({
      status: 'invalid',
      reason: 'nonIntegerAge',
    });
    expect(resolveParticipationOptions({ eligibilityAge: Number.POSITIVE_INFINITY })).toEqual({
      status: 'invalid',
      reason: 'nonIntegerAge',
    });
  });

  it('never offers Experienced below age 12', () => {
    expect(
      resolveParticipationOptions({ eligibilityAge: 11, isFirstYearQuizzer: false }),
    ).toEqual({
      status: 'eligible',
      participationType: 'competitive',
      allowedDivisionIds: ['junior'],
    });
  });
});
