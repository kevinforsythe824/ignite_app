import { OFFICIAL_DIVISION_IDS } from '../../../../../src/features/season/domain/division';
import { resolveParticipationOptions } from '../../../../../src/features/season/domain/eligibility/resolveParticipationOptions';

describe('resolveParticipationOptions', () => {
  it.each([
    { age: 1, expected: { status: 'invalid', reason: 'ineligibleAge' } },
    {
      age: 2,
      expected: {
        status: 'eligible',
        participationType: 'competitive',
        allowedDivisionIds: ['cadet', 'beginner'],
      },
    },
    {
      age: 4,
      expected: {
        status: 'eligible',
        participationType: 'competitive',
        allowedDivisionIds: ['cadet', 'beginner'],
      },
    },
    {
      age: 5,
      expected: {
        status: 'eligible',
        participationType: 'competitive',
        allowedDivisionIds: ['beginner'],
      },
    },
    {
      age: 8,
      expected: {
        status: 'eligible',
        participationType: 'competitive',
        allowedDivisionIds: ['beginner'],
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
        allowedDivisionIds: ['intermediate'],
      },
    },
    {
      age: 14,
      expected: {
        status: 'eligible',
        participationType: 'competitive',
        allowedDivisionIds: ['intermediate'],
      },
    },
  ])('age $age', ({ age, expected }) => {
    expect(resolveParticipationOptions({ eligibilityAge: age })).toEqual(expected);
  });

  it('age 15 first-year is Intermediate', () => {
    expect(
      resolveParticipationOptions({ eligibilityAge: 15, isFirstYearQuizzer: true }),
    ).toEqual({
      status: 'eligible',
      participationType: 'competitive',
      allowedDivisionIds: ['intermediate'],
    });
  });

  it('age 15 returning is Experienced', () => {
    expect(
      resolveParticipationOptions({ eligibilityAge: 15, isFirstYearQuizzer: false }),
    ).toEqual({
      status: 'eligible',
      participationType: 'competitive',
      allowedDivisionIds: ['experienced'],
    });
  });

  it('age 18 first-year is Intermediate', () => {
    expect(
      resolveParticipationOptions({ eligibilityAge: 18, isFirstYearQuizzer: true }),
    ).toEqual({
      status: 'eligible',
      participationType: 'competitive',
      allowedDivisionIds: ['intermediate'],
    });
  });

  it('age 18 returning is Experienced', () => {
    expect(
      resolveParticipationOptions({ eligibilityAge: 18, isFirstYearQuizzer: false }),
    ).toEqual({
      status: 'eligible',
      participationType: 'competitive',
      allowedDivisionIds: ['experienced'],
    });
  });

  it('age 15–18 without first-year is invalid', () => {
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
    expect(resolveParticipationOptions({ eligibilityAge: 30 })).toEqual({
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

  it('has no exceptional younger Experienced path', () => {
    expect(
      resolveParticipationOptions({ eligibilityAge: 14, isFirstYearQuizzer: false }),
    ).toEqual({
      status: 'eligible',
      participationType: 'competitive',
      allowedDivisionIds: ['intermediate'],
    });
    expect(
      resolveParticipationOptions({ eligibilityAge: 11, isFirstYearQuizzer: false }),
    ).toEqual({
      status: 'eligible',
      participationType: 'competitive',
      allowedDivisionIds: ['junior'],
    });
  });
});
