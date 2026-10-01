import {
  IGNITE_SEASON_TIME_ZONE,
  calendarDateInTimeZone,
  readAuthoritativeSeasonCalendarDate,
} from './authoritativeSeasonCalendarDate';
import { ParticipationCreateError } from './participationCreateError';

/** Fixed-offset zones used only to show America/Chicago is not a permanent UTC offset. */
const FIXED_UTC_MINUS_5 = 'Etc/GMT+5';
const FIXED_UTC_MINUS_6 = 'Etc/GMT+6';

describe('calendarDateInTimeZone', () => {
  it('uses America/Chicago as the only Season calendar timezone', () => {
    expect(IGNITE_SEASON_TIME_ZONE).toBe('America/Chicago');
  });

  it('crosses October 1 at the Central daylight midnight', () => {
    const beforeMidnight = new Date('2026-10-01T04:59:59Z');
    const atMidnight = new Date('2026-10-01T05:00:00Z');

    expect(calendarDateInTimeZone(beforeMidnight, IGNITE_SEASON_TIME_ZONE)).toBe('2026-09-30');
    expect(calendarDateInTimeZone(atMidnight, IGNITE_SEASON_TIME_ZONE)).toBe('2026-10-01');
    expect(calendarDateInTimeZone(atMidnight, FIXED_UTC_MINUS_6)).toBe('2026-09-30');
  });

  it('crosses a January midnight on Central standard time', () => {
    const beforeMidnight = new Date('2026-01-15T05:59:59Z');
    const atMidnight = new Date('2026-01-15T06:00:00Z');

    expect(calendarDateInTimeZone(beforeMidnight, IGNITE_SEASON_TIME_ZONE)).toBe('2026-01-14');
    expect(calendarDateInTimeZone(atMidnight, IGNITE_SEASON_TIME_ZONE)).toBe('2026-01-15');
    expect(calendarDateInTimeZone(beforeMidnight, FIXED_UTC_MINUS_5)).toBe('2026-01-15');
  });

  it('follows the spring-forward transition instead of a fixed Central offset', () => {
    // 2026-03-08 is the America/Chicago spring-forward. The next Central midnight
    // is UTC-5. A fixed UTC-6 offset would still be the previous calendar date.
    const afterSpringForward = new Date('2026-03-09T05:30:00Z');

    expect(calendarDateInTimeZone(afterSpringForward, IGNITE_SEASON_TIME_ZONE)).toBe('2026-03-09');
    expect(calendarDateInTimeZone(afterSpringForward, FIXED_UTC_MINUS_6)).toBe('2026-03-08');
    expect(calendarDateInTimeZone(afterSpringForward, FIXED_UTC_MINUS_5)).toBe('2026-03-09');
  });

  it('fails closed on an invalid instant', () => {
    expect(() => calendarDateInTimeZone(new Date(Number.NaN), IGNITE_SEASON_TIME_ZONE)).toThrow(
      ParticipationCreateError,
    );
    expect(() => calendarDateInTimeZone(new Date('not-a-date'), IGNITE_SEASON_TIME_ZONE)).toThrow(
      ParticipationCreateError,
    );

    try {
      calendarDateInTimeZone(new Date(Number.NaN), IGNITE_SEASON_TIME_ZONE);
    } catch (error) {
      expect(error).toBeInstanceOf(ParticipationCreateError);
      expect((error as ParticipationCreateError).reason).toBe('invalid-calendar-instant');
      expect((error as ParticipationCreateError).clientMessage).not.toContain('NaN');
    }
  });
});

describe('readAuthoritativeSeasonCalendarDate', () => {
  it('returns the America/Chicago date for an injected instant', () => {
    const instant = new Date('2026-10-01T05:00:00Z');
    expect(readAuthoritativeSeasonCalendarDate(() => instant)).toBe(
      calendarDateInTimeZone(instant, IGNITE_SEASON_TIME_ZONE),
    );
    expect(readAuthoritativeSeasonCalendarDate(() => instant)).toBe('2026-10-01');
  });

  it('fails closed when the injected clock returns an invalid instant', () => {
    expect(() => readAuthoritativeSeasonCalendarDate(() => new Date(Number.NaN))).toThrow(
      ParticipationCreateError,
    );
  });

  it('is the date port the participation callable uses', () => {
    const { readFileSync } = require('fs') as typeof import('fs');
    const { resolve } = require('path') as typeof import('path');
    const source = readFileSync(resolve(__dirname, '../index.ts'), 'utf8');
    expect(source).toContain('today: readAuthoritativeSeasonCalendarDate()');
    expect(source).not.toContain('calendar-unconfigured');
    expect(source).not.toContain('request.data.today');
    expect(source).not.toContain('request.data.timeZone');
  });

  it('does not read the clock inside the pure converter', () => {
    const { readFileSync } = require('fs') as typeof import('fs');
    const { resolve } = require('path') as typeof import('path');
    const source = readFileSync(resolve(__dirname, 'authoritativeSeasonCalendarDate.ts'), 'utf8');
    const pureStart = source.indexOf('export function calendarDateInTimeZone');
    const adapterStart = source.indexOf('export function readAuthoritativeSeasonCalendarDate');
    const pureSource = source.slice(pureStart, adapterStart);
    expect(pureSource).not.toContain('Date.now');
    expect(pureSource).not.toContain('new Date');
    expect(source).toContain("IGNITE_SEASON_TIME_ZONE = 'America/Chicago'");
    expect(source).not.toContain('process.env');
  });
});
