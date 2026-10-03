import { readFileSync } from 'fs';
import { resolve } from 'path';

import {
  IGNITE_SEASON_TIME_ZONE,
  calendarDateInTimeZone,
  formatIgniteSeasonCalendarDate,
} from '../../../src/features/season/domain/seasonCalendarDate';

import { readAuthoritativeSeasonCalendarDate } from './authoritativeSeasonCalendarDate';
import { ParticipationCreateError } from './participationCreateError';

/** Fixed-offset zones used only to show America/Chicago is not a permanent UTC offset. */
const FIXED_UTC_MINUS_5 = 'Etc/GMT+5';
const FIXED_UTC_MINUS_6 = 'Etc/GMT+6';

function expectCalendarDate(instant: Date, timeZone: string, calendarDate: string): void {
  expect(calendarDateInTimeZone(instant, timeZone)).toEqual({ status: 'date', calendarDate });
}

describe('calendarDateInTimeZone', () => {
  it('uses America/Chicago as the only Season calendar timezone', () => {
    expect(IGNITE_SEASON_TIME_ZONE).toBe('America/Chicago');
  });

  it('crosses October 1 at the Central daylight midnight', () => {
    const beforeMidnight = new Date('2026-10-01T04:59:59Z');
    const atMidnight = new Date('2026-10-01T05:00:00Z');

    expectCalendarDate(beforeMidnight, IGNITE_SEASON_TIME_ZONE, '2026-09-30');
    expectCalendarDate(atMidnight, IGNITE_SEASON_TIME_ZONE, '2026-10-01');
    expectCalendarDate(atMidnight, FIXED_UTC_MINUS_6, '2026-09-30');
  });

  it('crosses a January midnight on Central standard time', () => {
    const beforeMidnight = new Date('2026-01-15T05:59:59Z');
    const atMidnight = new Date('2026-01-15T06:00:00Z');

    expectCalendarDate(beforeMidnight, IGNITE_SEASON_TIME_ZONE, '2026-01-14');
    expectCalendarDate(atMidnight, IGNITE_SEASON_TIME_ZONE, '2026-01-15');
    expectCalendarDate(beforeMidnight, FIXED_UTC_MINUS_5, '2026-01-15');
  });

  it('follows the spring-forward transition instead of a fixed Central offset', () => {
    // 2026-03-08 is the America/Chicago spring-forward. The next Central midnight
    // is UTC-5. A fixed UTC-6 offset would still be the previous calendar date.
    const afterSpringForward = new Date('2026-03-09T05:30:00Z');

    expectCalendarDate(afterSpringForward, IGNITE_SEASON_TIME_ZONE, '2026-03-09');
    expectCalendarDate(afterSpringForward, FIXED_UTC_MINUS_6, '2026-03-08');
    expectCalendarDate(afterSpringForward, FIXED_UTC_MINUS_5, '2026-03-09');
  });

  it('fails closed on an invalid instant without a Functions error', () => {
    expect(calendarDateInTimeZone(new Date(Number.NaN), IGNITE_SEASON_TIME_ZONE)).toEqual({
      status: 'invalid',
      reason: 'invalidInstant',
    });
    expect(calendarDateInTimeZone(new Date('not-a-date'), IGNITE_SEASON_TIME_ZONE)).toEqual({
      status: 'invalid',
      reason: 'invalidInstant',
    });
    expect(() => calendarDateInTimeZone(new Date(Number.NaN), IGNITE_SEASON_TIME_ZONE)).not.toThrow();
  });

  it('returns strict YYYY-MM-DD', () => {
    const formatted = formatIgniteSeasonCalendarDate(new Date('2026-10-01T05:00:00Z'));
    expect(formatted).toEqual({ status: 'date', calendarDate: '2026-10-01' });
    if (formatted.status === 'date') {
      expect(formatted.calendarDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe('readAuthoritativeSeasonCalendarDate', () => {
  it('returns the America/Chicago date for an injected instant', () => {
    const instant = new Date('2026-10-01T05:00:00Z');
    const formatted = formatIgniteSeasonCalendarDate(instant);
    expect(formatted.status).toBe('date');
    if (formatted.status !== 'date') {
      return;
    }
    expect(readAuthoritativeSeasonCalendarDate(() => instant)).toBe(formatted.calendarDate);
    expect(readAuthoritativeSeasonCalendarDate(() => instant)).toBe('2026-10-01');
  });

  it('translates an invalid instant into ParticipationCreateError', () => {
    expect(() => readAuthoritativeSeasonCalendarDate(() => new Date(Number.NaN))).toThrow(
      ParticipationCreateError,
    );
    expect(() => readAuthoritativeSeasonCalendarDate(() => new Date('not-a-date'))).toThrow(
      ParticipationCreateError,
    );

    try {
      readAuthoritativeSeasonCalendarDate(() => new Date(Number.NaN));
    } catch (error) {
      expect(error).toBeInstanceOf(ParticipationCreateError);
      expect((error as ParticipationCreateError).reason).toBe('invalid-calendar-instant');
      expect((error as ParticipationCreateError).clientMessage).not.toContain('NaN');
    }
  });

  it('is the date port the participation callable uses', () => {
    const source = readFileSync(resolve(__dirname, '../index.ts'), 'utf8');
    expect(source).toContain('today: readAuthoritativeSeasonCalendarDate()');
    expect(source).not.toContain('calendar-unconfigured');
    expect(source).not.toContain('request.data.today');
    expect(source).not.toContain('request.data.timeZone');
  });

  it('keeps the pure converter free of the clock and Functions errors', () => {
    const domainSource = readFileSync(
      resolve(__dirname, '../../../src/features/season/domain/seasonCalendarDate.ts'),
      'utf8',
    );
    const adapterSource = readFileSync(resolve(__dirname, 'authoritativeSeasonCalendarDate.ts'), 'utf8');
    expect(domainSource).toContain("IGNITE_SEASON_TIME_ZONE = 'America/Chicago'");
    expect(domainSource).not.toContain('Date.now');
    expect(domainSource).not.toContain('new Date');
    expect(domainSource).not.toContain('process.env');
    expect(domainSource).not.toContain('ParticipationCreateError');
    expect(adapterSource).toContain('formatIgniteSeasonCalendarDate');
    expect(adapterSource).toContain("new ParticipationCreateError('invalid-calendar-instant')");
    expect(adapterSource).not.toContain("IGNITE_SEASON_TIME_ZONE =");
    expect(adapterSource).toContain('new Date()');
  });
});
