import { januaryFirstEligibilityCopy } from '../../../../src/features/season/domain/januaryFirstEligibilityCopy';
import { resolveSeasonYear } from '../../../../src/features/season/domain/seasonYear';

describe('januaryFirstEligibilityCopy', () => {
  it('asks the future question before January 1 of the supplied year', () => {
    expect(januaryFirstEligibilityCopy(2031, '2030-12-31')).toEqual({
      status: 'question',
      text: 'How old will you be on January 1, 2031?',
    });
    expect(januaryFirstEligibilityCopy(2026, '2025-06-01')).toEqual({
      status: 'question',
      text: 'How old will you be on January 1, 2026?',
    });
  });

  it('asks the past question on January 1 and after it', () => {
    expect(januaryFirstEligibilityCopy(2031, '2031-01-01')).toEqual({
      status: 'question',
      text: 'How old were you on January 1, 2031?',
    });
    expect(januaryFirstEligibilityCopy(2031, '2031-07-04')).toEqual({
      status: 'question',
      text: 'How old were you on January 1, 2031?',
    });
    expect(januaryFirstEligibilityCopy(2027, '2027-01-01')).toEqual({
      status: 'question',
      text: 'How old were you on January 1, 2027?',
    });
  });

  it('uses the year parsed from the season id', () => {
    const parsed = resolveSeasonYear('2034');
    expect(parsed.status).toBe('year');
    if (parsed.status !== 'year') {
      return;
    }
    expect(januaryFirstEligibilityCopy(parsed.year, '2033-08-09')).toEqual({
      status: 'question',
      text: 'How old will you be on January 1, 2034?',
    });
  });

  it('fails closed for a bad year or calendar date', () => {
    expect(januaryFirstEligibilityCopy(2031, '2031-02-29')).toEqual({
      status: 'invalid',
      reason: 'calendarDate',
    });
    expect(januaryFirstEligibilityCopy(2031, '2031-01-01T00:00:00Z')).toEqual({
      status: 'invalid',
      reason: 'calendarDate',
    });
    expect(januaryFirstEligibilityCopy(10000, '2031-01-02')).toEqual({
      status: 'invalid',
      reason: 'seasonYear',
    });
    expect(januaryFirstEligibilityCopy(2027.5, '2027-02-02')).toEqual({
      status: 'invalid',
      reason: 'seasonYear',
    });
  });
});
