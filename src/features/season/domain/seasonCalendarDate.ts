import { isIsoCalendarDate } from './isoCalendarDate';

/**
 * Canonical timezone for Ignite Season calendar boundaries only.
 *
 * America/Chicago governs igniteAvailabilityDate, Season-current determination,
 * and future Season lifecycle date comparisons that intentionally use the same
 * Season calendar. It does not define tournament local time, venue timezone,
 * user-facing event time, a general app timezone, or analytics timestamps.
 */
export const IGNITE_SEASON_TIME_ZONE = 'America/Chicago';

export type CalendarDateInTimeZoneResult =
  | { status: 'date'; calendarDate: string }
  | { status: 'invalid'; reason: 'invalidInstant' };

function numericPart(
  parts: readonly Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string | undefined {
  const value = parts.find((part) => part.type === type)?.value;
  if (value === undefined || !/^\d+$/.test(value)) {
    return undefined;
  }
  return value;
}

/**
 * Civil YYYY-MM-DD for an injected instant in an IANA timezone.
 * Parts are selected by type and padded here. Locale field order is not used.
 * This function does not read the current clock, Firebase, or the environment.
 * Failure is a typed result. It does not throw a Functions participation error.
 */
export function calendarDateInTimeZone(
  instant: Date,
  timeZone: string,
): CalendarDateInTimeZoneResult {
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
    return { status: 'invalid', reason: 'invalidInstant' };
  }
  if (typeof timeZone !== 'string' || timeZone.length === 0) {
    return { status: 'invalid', reason: 'invalidInstant' };
  }

  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      calendar: 'gregory',
      numberingSystem: 'latn',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(instant);
  } catch {
    return { status: 'invalid', reason: 'invalidInstant' };
  }

  const year = numericPart(parts, 'year');
  const month = numericPart(parts, 'month');
  const day = numericPart(parts, 'day');
  if (year === undefined || month === undefined || day === undefined) {
    return { status: 'invalid', reason: 'invalidInstant' };
  }

  const calendarDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  if (!/^\d{4}$/.test(year) || !isIsoCalendarDate(calendarDate)) {
    return { status: 'invalid', reason: 'invalidInstant' };
  }
  return { status: 'date', calendarDate };
}

/** Season calendar date for an injected instant in America/Chicago. */
export function formatIgniteSeasonCalendarDate(instant: Date): CalendarDateInTimeZoneResult {
  return calendarDateInTimeZone(instant, IGNITE_SEASON_TIME_ZONE);
}
