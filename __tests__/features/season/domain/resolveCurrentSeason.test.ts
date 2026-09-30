import { isIsoCalendarDate } from '../../../../src/features/season/domain/isoCalendarDate';
import {
  resolveCurrentSeason,
  type CurrentSeasonResult,
} from '../../../../src/features/season/domain/resolveCurrentSeason';
import {
  isSeasonSelectable,
  type Season,
  type SeasonStatus,
} from '../../../../src/features/season/domain/season';
import {
  DEV_SEASON_SELECTION_POLICY,
  RELEASE_SEASON_SELECTION_POLICY,
  type SeasonSelectionPolicy,
} from '../../../../src/features/season/domain/seasonSelectionPolicy';

function makeSeason(
  overrides: Partial<Season> & Pick<Season, 'seasonId' | 'status'>,
): Season {
  return {
    name: `Season ${overrides.seasonId}`,
    startDate: '2032-04-01',
    endDate: '2032-11-30',
    igniteAvailabilityDate: '2032-03-15',
    ...overrides,
  };
}

const draft2032 = makeSeason({ seasonId: '2032', status: 'draft' });

function resolve(
  seasons: readonly Season[],
  today: string,
  policy: SeasonSelectionPolicy,
): CurrentSeasonResult {
  return resolveCurrentSeason(seasons, today, policy);
}

describe('season selection policies', () => {
  it('lets DEV select draft, published, and activeLocked only', () => {
    expect([...DEV_SEASON_SELECTION_POLICY.permittedStatuses].sort()).toEqual([
      'activeLocked',
      'draft',
      'published',
    ]);
    expect(DEV_SEASON_SELECTION_POLICY.permittedStatuses).not.toContain('committeeValidated');
    expect(DEV_SEASON_SELECTION_POLICY.permittedStatuses).not.toContain('archived');
  });

  it('keeps RELEASE to published and activeLocked', () => {
    expect([...RELEASE_SEASON_SELECTION_POLICY.permittedStatuses].sort()).toEqual([
      'activeLocked',
      'published',
    ]);
    expect(RELEASE_SEASON_SELECTION_POLICY.permittedStatuses).not.toContain('draft');
    expect(RELEASE_SEASON_SELECTION_POLICY.permittedStatuses).not.toContain('committeeValidated');
    expect(RELEASE_SEASON_SELECTION_POLICY.permittedStatuses).not.toContain('archived');
  });

  it('does not widen isSeasonSelectable to include draft', () => {
    expect(isSeasonSelectable('draft')).toBe(false);
    expect(isSeasonSelectable('published')).toBe(true);
    expect(isSeasonSelectable('activeLocked')).toBe(true);
    expect(DEV_SEASON_SELECTION_POLICY.permittedStatuses).toContain('draft');
  });
});

describe('isIsoCalendarDate', () => {
  it('accepts real YYYY-MM-DD dates and rejects timestamps and impossible days', () => {
    expect(isIsoCalendarDate('2032-03-15')).toBe(true);
    expect(isIsoCalendarDate('2028-02-29')).toBe(true);
    expect(isIsoCalendarDate('2000-02-29')).toBe(true);
    expect(isIsoCalendarDate('2027-02-29')).toBe(false);
    expect(isIsoCalendarDate('1900-02-29')).toBe(false);
    expect(isIsoCalendarDate('2032-04-31')).toBe(false);
    expect(isIsoCalendarDate('2032-3-15')).toBe(false);
    expect(isIsoCalendarDate('2032-03-15T00:00:00Z')).toBe(false);
    expect(isIsoCalendarDate(' 2032-03-15')).toBe(false);
  });
});

describe('resolveCurrentSeason', () => {
  describe('DEV policy', () => {
    it('does not select a draft before its availability date', () => {
      expect(resolve([draft2032], '2032-03-14', DEV_SEASON_SELECTION_POLICY)).toEqual({
        status: 'none',
      });
    });

    it('selects a draft on its availability date', () => {
      expect(resolve([draft2032], '2032-03-15', DEV_SEASON_SELECTION_POLICY)).toEqual({
        status: 'current',
        season: draft2032,
      });
    });

    it('selects a draft during the window, including before startDate', () => {
      expect(resolve([draft2032], '2032-03-20', DEV_SEASON_SELECTION_POLICY)).toEqual({
        status: 'current',
        season: draft2032,
      });
      expect(resolve([draft2032], '2032-06-01', DEV_SEASON_SELECTION_POLICY)).toEqual({
        status: 'current',
        season: draft2032,
      });
    });

    it('selects a draft on its end date and not the day after', () => {
      expect(resolve([draft2032], '2032-11-30', DEV_SEASON_SELECTION_POLICY)).toEqual({
        status: 'current',
        season: draft2032,
      });
      expect(resolve([draft2032], '2032-12-01', DEV_SEASON_SELECTION_POLICY)).toEqual({
        status: 'none',
      });
    });

    it('does not select an archived season', () => {
      const archived = makeSeason({ seasonId: '2032', status: 'archived' });
      expect(resolve([archived], '2032-06-01', DEV_SEASON_SELECTION_POLICY)).toEqual({
        status: 'none',
      });
    });
  });

  describe('RELEASE policy', () => {
    it('does not select the same date-valid draft', () => {
      expect(resolve([draft2032], '2032-06-01', RELEASE_SEASON_SELECTION_POLICY)).toEqual({
        status: 'none',
      });
    });

    it('selects a date-valid published season', () => {
      const published = makeSeason({ seasonId: '2035', status: 'published' });
      expect(resolve([published], '2032-06-01', RELEASE_SEASON_SELECTION_POLICY)).toEqual({
        status: 'current',
        season: published,
      });
    });

    it('selects a date-valid activeLocked season', () => {
      const activeLocked = makeSeason({ seasonId: '2036', status: 'activeLocked' });
      expect(resolve([activeLocked], '2032-06-01', RELEASE_SEASON_SELECTION_POLICY)).toEqual({
        status: 'current',
        season: activeLocked,
      });
    });
  });

  describe('shared candidate rules', () => {
    const policies = [
      ['DEV', DEV_SEASON_SELECTION_POLICY],
      ['RELEASE', RELEASE_SEASON_SELECTION_POLICY],
    ] as const;

    it.each(policies)('%s ignores a season with no igniteAvailabilityDate', (_label, policy) => {
      const published = makeSeason({ seasonId: '2035', status: 'published' });
      const { igniteAvailabilityDate: _omitted, ...missingAvailability } = published;
      expect(resolve([missingAvailability], '2032-06-01', policy)).toEqual({ status: 'none' });
    });

    it.each(policies)('%s does not select committeeValidated', (_label, policy) => {
      const committee = makeSeason({ seasonId: '2038', status: 'committeeValidated' });
      expect(resolve([committee], '2032-06-01', policy)).toEqual({ status: 'none' });
    });

    it('ignores a future season and returns none when nothing else qualifies', () => {
      const future = makeSeason({
        seasonId: '2099',
        status: 'published',
        igniteAvailabilityDate: '2098-12-02',
        startDate: '2099-01-01',
        endDate: '2099-07-31',
      });
      expect(resolve([future], '2032-06-01', RELEASE_SEASON_SELECTION_POLICY)).toEqual({
        status: 'none',
      });
    });

    it('returns none when there are no seasons', () => {
      expect(resolve([], '2032-06-01', DEV_SEASON_SELECTION_POLICY)).toEqual({ status: 'none' });
    });

    it('returns the only candidate', () => {
      const only = makeSeason({ seasonId: '2026', status: 'published' });
      expect(resolve([only], '2032-06-01', RELEASE_SEASON_SELECTION_POLICY)).toEqual({
        status: 'current',
        season: only,
      });
    });

    it('returns ambiguous when two seasons are date-valid and does not pick one', () => {
      const earlier = makeSeason({ seasonId: '2032', status: 'published' });
      const later = makeSeason({
        seasonId: '2033',
        status: 'published',
        igniteAvailabilityDate: '2032-01-20',
        startDate: '2033-01-01',
        endDate: '2033-08-31',
      });
      const result = resolve([earlier, later], '2032-06-01', RELEASE_SEASON_SELECTION_POLICY);
      expect(result).toEqual({ status: 'ambiguous' });
      expect(result).not.toHaveProperty('season');
    });

    it('returns the in-window season when another season is still in the future', () => {
      const current = makeSeason({ seasonId: '2034', status: 'activeLocked' });
      const future = makeSeason({
        seasonId: '2027',
        status: 'published',
        igniteAvailabilityDate: '2090-05-04',
        startDate: '2090-06-01',
        endDate: '2091-01-15',
      });
      expect(resolve([future, current], '2032-06-01', DEV_SEASON_SELECTION_POLICY)).toEqual({
        status: 'current',
        season: current,
      });
    });

    it('can select a season id other than a single hard-coded year', () => {
      const season2026 = makeSeason({
        seasonId: '2026',
        status: 'published',
        igniteAvailabilityDate: '2025-11-02',
        startDate: '2026-01-04',
        endDate: '2026-08-20',
      });
      expect(resolve([season2026], '2026-02-02', RELEASE_SEASON_SELECTION_POLICY)).toEqual({
        status: 'current',
        season: season2026,
      });
    });
  });

  it('uses the supplied policy rather than an environment branch', () => {
    const devResult = resolveCurrentSeason(
      [draft2032],
      '2032-06-01',
      DEV_SEASON_SELECTION_POLICY,
    );
    const releaseResult = resolveCurrentSeason(
      [draft2032],
      '2032-06-01',
      RELEASE_SEASON_SELECTION_POLICY,
    );
    expect(devResult).toEqual({ status: 'current', season: draft2032 });
    expect(releaseResult).toEqual({ status: 'none' });
  });

  it('never selects archived even when a policy lists it', () => {
    const archived = makeSeason({ seasonId: '2040', status: 'archived' });
    const policy: SeasonSelectionPolicy = { permittedStatuses: ['archived', 'draft'] };
    expect(resolve([archived], '2032-06-01', policy)).toEqual({ status: 'none' });
    expect(resolve([draft2032], '2032-06-01', policy)).toEqual({
      status: 'current',
      season: draft2032,
    });
  });

  it('fails closed for an invalid calendar date instead of guessing', () => {
    expect(resolve([draft2032], '2032-02-31', DEV_SEASON_SELECTION_POLICY)).toEqual({
      status: 'invalid',
      reason: 'calendarDate',
    });
    expect(resolve([draft2032], '2032-06-01T00:00:00Z', DEV_SEASON_SELECTION_POLICY)).toEqual({
      status: 'invalid',
      reason: 'calendarDate',
    });
  });

  it('fails the catalog when a season document is malformed', () => {
    const badEnd = makeSeason({ seasonId: '2041', status: 'published', endDate: '2032-02-31' });
    const inverted = makeSeason({
      seasonId: '2042',
      status: 'published',
      startDate: '2033-01-01',
      endDate: '2032-11-30',
    });
    const blankName = makeSeason({ seasonId: '2044', status: 'published', name: ' ' });
    const badStatus = {
      ...makeSeason({ seasonId: '2045', status: 'published' }),
      status: 'live' as SeasonStatus,
    };
    expect(
      resolve([badEnd], '2032-06-01', RELEASE_SEASON_SELECTION_POLICY),
    ).toEqual({ status: 'invalid', reason: 'catalog' });
    expect(
      resolve([inverted, blankName, badStatus], '2032-06-01', RELEASE_SEASON_SELECTION_POLICY),
    ).toEqual({ status: 'invalid', reason: 'catalog' });
  });

  it('does not treat a sole malformed in-window season as none', () => {
    const malformed = {
      ...makeSeason({ seasonId: '2046', status: 'published' }),
      name: ' ',
    };
    expect(resolve([malformed], '2032-06-01', RELEASE_SEASON_SELECTION_POLICY)).toEqual({
      status: 'invalid',
      reason: 'catalog',
    });
  });

  it('does not skip a malformed sibling and keep a valid current season', () => {
    const valid = makeSeason({ seasonId: '2034', status: 'published' });
    const malformed = { ...valid, seasonId: '2035', endDate: '2032-02-31' };
    expect(
      resolve([malformed, valid], '2032-06-01', RELEASE_SEASON_SELECTION_POLICY),
    ).toEqual({ status: 'invalid', reason: 'catalog' });
  });

  it('treats igniteAvailabilityDate after endDate as invalid configuration', () => {
    const invertedAvailability = makeSeason({
      seasonId: '2047',
      status: 'published',
      startDate: '2032-04-01',
      endDate: '2032-11-30',
      igniteAvailabilityDate: '2033-01-01',
    });
    expect(
      resolve([invertedAvailability], '2032-06-01', RELEASE_SEASON_SELECTION_POLICY),
    ).toEqual({ status: 'invalid', reason: 'catalog' });

    const valid = makeSeason({ seasonId: '2034', status: 'published' });
    expect(
      resolve([valid, invertedAvailability], '2032-06-01', RELEASE_SEASON_SELECTION_POLICY),
    ).toEqual({ status: 'invalid', reason: 'catalog' });
  });

  it('rejects a non-array season catalog', () => {
    expect(
      resolveCurrentSeason(null, '2032-06-01', RELEASE_SEASON_SELECTION_POLICY),
    ).toEqual({ status: 'invalid', reason: 'catalog' });
    expect(
      resolveCurrentSeason({ seasonId: '2032' }, '2032-06-01', DEV_SEASON_SELECTION_POLICY),
    ).toEqual({ status: 'invalid', reason: 'catalog' });
  });

  it('rejects a malformed selection policy instead of returning none', () => {
    expect(
      resolveCurrentSeason([], '2032-06-01', { permittedStatuses: 'published' }),
    ).toEqual({ status: 'invalid', reason: 'selectionPolicy' });
    expect(resolveCurrentSeason([], '2032-06-01', null)).toEqual({
      status: 'invalid',
      reason: 'selectionPolicy',
    });
    expect(
      resolveCurrentSeason([], '2032-06-01', {
        permittedStatuses: ['published', 'live'],
      }),
    ).toEqual({ status: 'invalid', reason: 'selectionPolicy' });
    expect(
      resolveCurrentSeason([], '2032-06-01', {
        permittedStatuses: ['published'],
        source: 'dev',
      }),
    ).toEqual({ status: 'invalid', reason: 'selectionPolicy' });
  });
});
