import {
  getDivisionLabel,
  isDivisionId,
  OFFICIAL_DIVISION_IDS,
} from '../../../../src/features/season/domain/division';

describe('official divisions', () => {
  it('has exactly five official IDs and no Senior', () => {
    expect(OFFICIAL_DIVISION_IDS).toEqual([
      'cadet',
      'beginner',
      'junior',
      'intermediate',
      'experienced',
    ]);
    expect(OFFICIAL_DIVISION_IDS).not.toContain('senior');
    expect(OFFICIAL_DIVISION_IDS).toHaveLength(5);
  });

  it('labels experienced as Experienced', () => {
    expect(getDivisionLabel('experienced')).toBe('Experienced');
    expect(getDivisionLabel('cadet')).toBe('Cadet');
  });

  it('accepts only official division ids', () => {
    expect(isDivisionId('junior')).toBe(true);
    expect(isDivisionId('senior')).toBe(false);
    expect(isDivisionId('Experienced')).toBe(false);
  });
});
