import { readFileSync } from 'fs';
import { resolve } from 'path';

import { isIsoCalendarDate } from '../../../../src/features/season/domain/isoCalendarDate';
import {
  IGNITE_SEASON_TIME_ZONE,
  calendarDateInTimeZone,
  formatIgniteSeasonCalendarDate,
} from '../../../../src/features/season/domain/seasonCalendarDate';

/** Fixed-offset zones used only to show America/Chicago is not a permanent UTC offset. */
const FIXED_UTC_MINUS_5 = 'Etc/GMT+5';
const FIXED_UTC_MINUS_6 = 'Etc/GMT+6';

function expectCalendarDate(instant: Date, timeZone: string, calendarDate: string): void {
  const formatted = calendarDateInTimeZone(instant, timeZone);
  expect(formatted).toEqual({ status: 'date', calendarDate });
  if (formatted.status === 'date') {
    expect(formatted.calendarDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(isIsoCalendarDate(formatted.calendarDate)).toBe(true);
  }
}

describe('season calendar date', () => {
  it('uses America/Chicago as the only Season calendar timezone', () => {
    expect(IGNITE_SEASON_TIME_ZONE).toBe('America/Chicago');
  });

  it('crosses October 1 at the Central daylight midnight', () => {
    const beforeMidnight = new Date('2026-10-01T04:59:59Z');
    const atMidnight = new Date('2026-10-01T05:00:00Z');

    expectCalendarDate(beforeMidnight, IGNITE_SEASON_TIME_ZONE, '2026-09-30');
    expectCalendarDate(atMidnight, IGNITE_SEASON_TIME_ZONE, '2026-10-01');
    expectCalendarDate(atMidnight, FIXED_UTC_MINUS_6, '2026-09-30');
    expect(formatIgniteSeasonCalendarDate(atMidnight)).toEqual(
      calendarDateInTimeZone(atMidnight, IGNITE_SEASON_TIME_ZONE),
    );
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

  it('fails closed on an invalid instant without throwing', () => {
    expect(calendarDateInTimeZone(new Date(Number.NaN), IGNITE_SEASON_TIME_ZONE)).toEqual({
      status: 'invalid',
      reason: 'invalidInstant',
    });
    expect(calendarDateInTimeZone(new Date('not-a-date'), IGNITE_SEASON_TIME_ZONE)).toEqual({
      status: 'invalid',
      reason: 'invalidInstant',
    });
    expect(JSON.stringify(calendarDateInTimeZone(new Date(Number.NaN), IGNITE_SEASON_TIME_ZONE))).not.toContain(
      'NaN',
    );
  });

  it('does not read the clock, environment, or Functions errors', () => {
    const source = readFileSync(
      resolve(__dirname, '../../../../src/features/season/domain/seasonCalendarDate.ts'),
      'utf8',
    );
    expect(source).toContain("IGNITE_SEASON_TIME_ZONE = 'America/Chicago'");
    expect(source).not.toContain('Date.now');
    expect(source).not.toContain('new Date');
    expect(source).not.toContain('process.env');
    expect(source).not.toContain('ParticipationCreateError');
    expect(source).not.toContain('firebase');
  });
});
