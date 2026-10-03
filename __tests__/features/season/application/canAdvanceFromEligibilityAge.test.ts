import { readFileSync } from 'fs';
import { resolve } from 'path';

import { canAdvanceFromEligibilityAge } from '../../../../src/features/season/application/canAdvanceFromEligibilityAge';
import { resolveParticipationOptions } from '../../../../src/features/season/domain/eligibility/resolveParticipationOptions';

describe('canAdvanceFromEligibilityAge', () => {
  it('does not advance ineligibleAge, including age 1', () => {
    expect(resolveParticipationOptions({ eligibilityAge: 1 })).toEqual({
      status: 'invalid',
      reason: 'ineligibleAge',
    });
    expect(canAdvanceFromEligibilityAge(1)).toBe(false);
    expect(canAdvanceFromEligibilityAge(0)).toBe(false);
  });

  it('advances eligible ages 2, 10, and 19', () => {
    expect(canAdvanceFromEligibilityAge(2)).toBe(true);
    expect(canAdvanceFromEligibilityAge(10)).toBe(true);
    expect(canAdvanceFromEligibilityAge(19)).toBe(true);
  });

  it('lets ages 15–18 advance to First Year before that question is answered', () => {
    expect(resolveParticipationOptions({ eligibilityAge: 16 })).toEqual({
      status: 'invalid',
      reason: 'firstYearRequired',
    });
    expect(canAdvanceFromEligibilityAge(15)).toBe(true);
    expect(canAdvanceFromEligibilityAge(16)).toBe(true);
    expect(canAdvanceFromEligibilityAge(18)).toBe(true);
  });

  it('rejects non-integer, NaN, and non-finite ages', () => {
    expect(canAdvanceFromEligibilityAge(2.5)).toBe(false);
    expect(canAdvanceFromEligibilityAge(Number.NaN)).toBe(false);
    expect(canAdvanceFromEligibilityAge(Number.POSITIVE_INFINITY)).toBe(false);
    expect(canAdvanceFromEligibilityAge(Number.NEGATIVE_INFINITY)).toBe(false);
  });

  it('continues only for eligible or firstYearRequired, not for every other reason', () => {
    const source = readFileSync(
      resolve(
        __dirname,
        '../../../../src/features/season/application/canAdvanceFromEligibilityAge.ts',
      ),
      'utf8',
    );
    expect(source).toContain("reason === 'firstYearRequired'");
    expect(source).not.toContain("!== 'nonIntegerAge'");
    expect(source).not.toContain('!== "nonIntegerAge"');
    expect(source).not.toContain('isFirstYearQuizzer');
  });
});
