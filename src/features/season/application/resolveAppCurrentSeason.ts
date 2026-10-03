import { formatIgniteSeasonCalendarDate } from '../domain/seasonCalendarDate';
import {
  resolveCurrentSeason,
  type CurrentSeasonInvalidReason,
} from '../domain/resolveCurrentSeason';
import type { Season } from '../domain/season';
import { selectSeasonSelectionPolicy } from '../domain/seasonSelectionPolicy';

/**
 * App composition for the current Season.
 * Callers inject the season catalog, the instant, and the environment name.
 * This function does not read Firestore or the process environment.
 */
export interface ResolveAppCurrentSeasonInput {
  seasons: unknown;
  instant: Date;
  environment: string;
}

export type AppCurrentSeasonResult =
  | { status: 'invalid'; reason: 'unknownEnvironment' | 'calendarInstant' }
  | {
      status: 'invalid';
      reason: CurrentSeasonInvalidReason;
      calendarDate: string;
    }
  | { status: 'none'; calendarDate: string }
  | { status: 'ambiguous'; calendarDate: string }
  | { status: 'current'; season: Season; calendarDate: string };

export function resolveAppCurrentSeason(
  input: ResolveAppCurrentSeasonInput,
): AppCurrentSeasonResult {
  const selected = selectSeasonSelectionPolicy(input.environment);
  if (selected.status === 'invalid') {
    return { status: 'invalid', reason: 'unknownEnvironment' };
  }

  const formatted = formatIgniteSeasonCalendarDate(input.instant);
  if (formatted.status === 'invalid') {
    return { status: 'invalid', reason: 'calendarInstant' };
  }

  const calendarDate = formatted.calendarDate;
  const resolved = resolveCurrentSeason(input.seasons, calendarDate, selected.policy);
  if (resolved.status === 'current') {
    return { status: 'current', season: resolved.season, calendarDate };
  }
  if (resolved.status === 'none') {
    return { status: 'none', calendarDate };
  }
  if (resolved.status === 'ambiguous') {
    return { status: 'ambiguous', calendarDate };
  }
  return { status: 'invalid', reason: resolved.reason, calendarDate };
}
