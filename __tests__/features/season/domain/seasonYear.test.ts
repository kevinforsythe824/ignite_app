import { resolveSeasonYear } from '../../../../src/features/season/domain/seasonYear';

describe('resolveSeasonYear', () => {
  it('reads a four-digit season id as that year', () => {
    expect(resolveSeasonYear('2031')).toEqual({ status: 'year', year: 2031 });
    expect(resolveSeasonYear('2026')).toEqual({ status: 'year', year: 2026 });
    expect(resolveSeasonYear('2027')).toEqual({ status: 'year', year: 2027 });
    expect(resolveSeasonYear('1999')).toEqual({ status: 'year', year: 1999 });
  });

  it('fails closed for malformed ids and does not invent a year', () => {
    const malformed = ['27', '20311', 'season-2031', '2031-01-01', '', ' 2031', 'abcd', '2027 '];
    for (const seasonId of malformed) {
      expect(resolveSeasonYear(seasonId)).toEqual({
        status: 'invalid',
        reason: 'malformedSeasonId',
      });
    }
  });

  it('does not accept a start date in place of a season id', () => {
    expect(resolveSeasonYear('2030-10-15')).toEqual({
      status: 'invalid',
      reason: 'malformedSeasonId',
    });
  });
});
