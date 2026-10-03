import { formatIgniteSeasonCalendarDate } from '../../../src/features/season/domain/seasonCalendarDate';

import { ParticipationCreateError } from './participationCreateError';

/**
 * Production Season calendar date.
 * Reads or injects the current instant, formats it with the shared Season
 * calendar helper, and translates a shared-domain failure into
 * ParticipationCreateError. The pure formatter does not live here.
 * Tests inject a clock so they do not depend on the wall clock.
 * The timezone does not vary by environment.
 */
export function readAuthoritativeSeasonCalendarDate(now: () => Date = () => new Date()): string {
  const formatted = formatIgniteSeasonCalendarDate(now());
  if (formatted.status === 'invalid') {
    throw new ParticipationCreateError('invalid-calendar-instant');
  }
  return formatted.calendarDate;
}
