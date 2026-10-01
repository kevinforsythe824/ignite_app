import { isIsoCalendarDate } from '../../../src/features/season/domain/isoCalendarDate';

import { ParticipationCreateError } from './participationCreateError';

/**
 * Canonical timezone for Ignite Season calendar boundaries only.
 *
 * America/Chicago governs igniteAvailabilityDate, Season-current determination,
 * and future Season lifecycle date comparisons that intentionally use the same
 * Season calendar. It does not define tournament local time, venue timezone,
 * user-facing event time, a general app timezone, or analytics timestamps.
 */
export const IGNITE_SEASON_TIME_ZONE = 'America/Chicago';

function requireNumericPart(
  parts: readonly Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  const value = parts.find((part) => part.type === type)?.value;
  if (value === undefined || !/^\d+$/.test(value)) {
    throw new ParticipationCreateError('invalid-calendar-instant');
  }
  return value;
}

/**
 * Civil YYYY-MM-DD for an instant in an IANA timezone.
 * Parts are selected by type and padded here. Locale field order is not used.
 * This function does not read the current clock.
 */
export function calendarDateInTimeZone(instant: Date, timeZone: string): string {
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
    throw new ParticipationCreateError('invalid-calendar-instant');
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    calendar: 'gregory',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);

  const year = requireNumericPart(parts, 'year');
  const month = requireNumericPart(parts, 'month').padStart(2, '0');
  const day = requireNumericPart(parts, 'day').padStart(2, '0');
  const calendarDate = `${year}-${month}-${day}`;
  if (!/^\d{4}$/.test(year) || !isIsoCalendarDate(calendarDate)) {
    throw new ParticipationCreateError('invalid-calendar-instant');
  }
  return calendarDate;
}

/**
 * Production Season calendar date. The default clock is the current instant.
 * Tests inject a clock so they do not depend on the wall clock.
 * The timezone does not vary by environment.
 */
export function readAuthoritativeSeasonCalendarDate(now: () => Date = () => new Date()): string {
  return calendarDateInTimeZone(now(), IGNITE_SEASON_TIME_ZONE);
}
