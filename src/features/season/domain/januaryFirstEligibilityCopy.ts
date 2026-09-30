import { isIsoCalendarDate } from './isoCalendarDate';

/**
 * Question copy for the January 1 eligibility age.
 * Does not compute age, store a date of birth, or replace resolveParticipationOptions.
 */

const MIN_CALENDAR_YEAR = 0;
const MAX_CALENDAR_YEAR = 9999;

export type JanuaryFirstEligibilityCopyResult =
  | { status: 'question'; text: string }
  | { status: 'invalid'; reason: 'seasonYear' | 'calendarDate' };

function fourDigitYearLabel(year: number): string | undefined {
  if (!Number.isInteger(year) || year < MIN_CALENDAR_YEAR || year > MAX_CALENDAR_YEAR) {
    return undefined;
  }
  return String(year).padStart(4, '0');
}

export function januaryFirstEligibilityCopy(
  seasonYear: number,
  calendarDate: string,
): JanuaryFirstEligibilityCopyResult {
  const yearLabel = fourDigitYearLabel(seasonYear);
  if (yearLabel === undefined) {
    return { status: 'invalid', reason: 'seasonYear' };
  }
  if (!isIsoCalendarDate(calendarDate)) {
    return { status: 'invalid', reason: 'calendarDate' };
  }

  const januaryFirst = `${yearLabel}-01-01`;
  if (!isIsoCalendarDate(januaryFirst)) {
    return { status: 'invalid', reason: 'seasonYear' };
  }

  const askingAboutFutureJanuary = calendarDate < januaryFirst;
  const text = askingAboutFutureJanuary
    ? `How old will you be on January 1, ${yearLabel}?`
    : `How old were you on January 1, ${yearLabel}?`;

  return { status: 'question', text };
}
