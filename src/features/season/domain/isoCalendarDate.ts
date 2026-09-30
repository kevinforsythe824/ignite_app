/**
 * Already-resolved calendar dates as YYYY-MM-DD.
 * Callers supply the date. This module does not read a clock or pick a timezone.
 */

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

const ISO_CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isLeapYear(year: number): boolean {
  if (year % 400 === 0) {
    return true;
  }
  if (year % 100 === 0) {
    return false;
  }
  return year % 4 === 0;
}

/** True only for a real YYYY-MM-DD calendar date. Timestamps and unpadded dates fail. */
export function isIsoCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const match = ISO_CALENDAR_DATE.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) {
    return false;
  }

  const monthLength = MONTH_LENGTHS[month - 1];
  if (monthLength === undefined) {
    return false;
  }

  const maxDay = month === 2 && isLeapYear(year) ? 29 : monthLength;
  return day >= 1 && day <= maxDay;
}
