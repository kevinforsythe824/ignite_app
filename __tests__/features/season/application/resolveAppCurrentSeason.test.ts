import { readFileSync } from 'fs';
import { resolve } from 'path';

import { resolveAppCurrentSeason } from '../../../../src/features/season/application/resolveAppCurrentSeason';
import { seasonSetupJanuaryFirstQuestion } from '../../../../src/features/season/application/seasonSetupJanuaryFirstQuestion';
import { selectSeasonSelectionPolicy } from '../../../../src/features/season/domain/seasonSelectionPolicy';
import {
  DEV_SEASON_SELECTION_POLICY,
  RELEASE_SEASON_SELECTION_POLICY,
} from '../../../../src/features/season/domain/seasonSelectionPolicy';
import type { Season } from '../../../../src/features/season/domain/season';

function season(status: Season['status']): Season {
  return {
    seasonId: '2032',
    name: 'Season 2032',
    startDate: '2032-09-01',
    endDate: '2033-06-30',
    igniteAvailabilityDate: '2032-10-01',
    status,
  };
}

describe('selectSeasonSelectionPolicy', () => {
  it('reuses the DEV and RELEASE policy objects and fails closed otherwise', () => {
    const dev = selectSeasonSelectionPolicy('dev');
    const staging = selectSeasonSelectionPolicy('staging');
    const prod = selectSeasonSelectionPolicy('prod');
    expect(dev).toEqual({ status: 'selected', policy: DEV_SEASON_SELECTION_POLICY });
    expect(staging).toEqual({ status: 'selected', policy: RELEASE_SEASON_SELECTION_POLICY });
    expect(prod).toEqual({ status: 'selected', policy: RELEASE_SEASON_SELECTION_POLICY });
    if (dev.status === 'selected') {
      expect(dev.policy).toBe(DEV_SEASON_SELECTION_POLICY);
    }
    if (staging.status === 'selected' && prod.status === 'selected') {
      expect(staging.policy).toBe(RELEASE_SEASON_SELECTION_POLICY);
      expect(prod.policy).toBe(RELEASE_SEASON_SELECTION_POLICY);
    }
    expect(selectSeasonSelectionPolicy('qa')).toEqual({
      status: 'invalid',
      reason: 'unknownEnvironment',
    });
    expect(selectSeasonSelectionPolicy('')).toEqual({
      status: 'invalid',
      reason: 'unknownEnvironment',
    });
  });
});

describe('resolveAppCurrentSeason', () => {
  const beforeChicagoMidnight = new Date('2032-10-01T04:59:59Z');
  const atChicagoMidnight = new Date('2032-10-01T05:00:00Z');

  it('uses the Chicago calendar date and the DEV draft policy', () => {
    expect(
      resolveAppCurrentSeason({
        seasons: [season('draft')],
        instant: beforeChicagoMidnight,
        environment: 'dev',
      }),
    ).toEqual({ status: 'none', calendarDate: '2032-09-30' });

    expect(
      resolveAppCurrentSeason({
        seasons: [season('draft')],
        instant: atChicagoMidnight,
        environment: 'dev',
      }),
    ).toEqual({
      status: 'current',
      season: season('draft'),
      calendarDate: '2032-10-01',
    });
  });

  it('uses the release policy in staging and prod', () => {
    expect(
      resolveAppCurrentSeason({
        seasons: [season('draft')],
        instant: atChicagoMidnight,
        environment: 'staging',
      }),
    ).toEqual({ status: 'none', calendarDate: '2032-10-01' });
    expect(
      resolveAppCurrentSeason({
        seasons: [season('draft')],
        instant: atChicagoMidnight,
        environment: 'prod',
      }),
    ).toEqual({ status: 'none', calendarDate: '2032-10-01' });
    expect(
      resolveAppCurrentSeason({
        seasons: [season('published')],
        instant: atChicagoMidnight,
        environment: 'prod',
      }),
    ).toEqual({
      status: 'current',
      season: season('published'),
      calendarDate: '2032-10-01',
    });
  });

  it('fails closed for an unknown environment or an invalid instant', () => {
    expect(
      resolveAppCurrentSeason({
        seasons: [season('published')],
        instant: atChicagoMidnight,
        environment: 'qa',
      }),
    ).toEqual({ status: 'invalid', reason: 'unknownEnvironment' });
    expect(
      resolveAppCurrentSeason({
        seasons: [season('published')],
        instant: new Date(Number.NaN),
        environment: 'dev',
      }),
    ).toEqual({ status: 'invalid', reason: 'calendarInstant' });
  });

  it('feeds the canonical calendar date into the January 1 question', () => {
    const resolved = resolveAppCurrentSeason({
      seasons: [season('published')],
      instant: atChicagoMidnight,
      environment: 'staging',
    });
    expect(resolved.status).toBe('current');
    if (resolved.status !== 'current') {
      return;
    }
    expect(seasonSetupJanuaryFirstQuestion(resolved.season.seasonId, resolved.calendarDate)).toEqual({
      status: 'question',
      text: 'How old were you on January 1, 2032?',
    });
  });

  it('does not read the environment variable or hard-code a season year', () => {
    const source = readFileSync(
      resolve(__dirname, '../../../../src/features/season/application/resolveAppCurrentSeason.ts'),
      'utf8',
    );
    expect(source).toContain('resolveCurrentSeason');
    expect(source).toContain('selectSeasonSelectionPolicy');
    expect(source).toContain('formatIgniteSeasonCalendarDate');
    expect(source).not.toContain('EXPO_PUBLIC_IGNITE_ENV');
    expect(source).not.toContain('process.env');
    expect(source).not.toContain('Date.now');
    expect(source).not.toContain('2027');
    expect(source).not.toContain('draft');
  });
});
