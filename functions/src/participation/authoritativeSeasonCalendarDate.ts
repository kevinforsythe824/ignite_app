import { ParticipationCreateError } from './participationCreateError';

/**
 * Calendar-date port for the participation callable.
 * No authoritative Season timezone is configured in this repository.
 * This function does not guess UTC, the host zone, or a client-supplied date.
 */
export function readAuthoritativeSeasonCalendarDate(): string {
  throw new ParticipationCreateError('calendar-unconfigured');
}
