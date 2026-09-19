import {
  isContentImmutable,
  isSeasonSelectable,
  type Season,
  type SeasonStatus,
} from '../../../../src/features/season/domain/season';

const ALL_STATUSES: readonly SeasonStatus[] = [
  'draft',
  'committeeValidated',
  'published',
  'activeLocked',
  'archived',
];

describe('season status helpers', () => {
  it('treats Active/Locked and Archived content as immutable', () => {
    expect(isContentImmutable('activeLocked')).toBe(true);
    expect(isContentImmutable('archived')).toBe(true);
    expect(isContentImmutable('draft')).toBe(false);
    expect(isContentImmutable('committeeValidated')).toBe(false);
    expect(isContentImmutable('published')).toBe(false);
  });

  it('treats Published and Active/Locked seasons as selectable', () => {
    expect(isSeasonSelectable('published')).toBe(true);
    expect(isSeasonSelectable('activeLocked')).toBe(true);
    expect(isSeasonSelectable('draft')).toBe(false);
    expect(isSeasonSelectable('committeeValidated')).toBe(false);
    expect(isSeasonSelectable('archived')).toBe(false);
  });

  it('covers every status with a deterministic answer', () => {
    for (const status of ALL_STATUSES) {
      expect(typeof isContentImmutable(status)).toBe('boolean');
      expect(typeof isSeasonSelectable(status)).toBe('boolean');
    }
  });

  it('stores dates as strings, not Date objects', () => {
    const season: Season = {
      seasonId: 's1',
      name: 'Example Season',
      startDate: '2026-10-01',
      endDate: '2027-08-01',
      status: 'published',
    };

    expect(typeof season.startDate).toBe('string');
    expect(typeof season.endDate).toBe('string');
  });
});
