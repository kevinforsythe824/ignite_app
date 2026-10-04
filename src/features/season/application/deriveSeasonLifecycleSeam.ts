import type { SeasonParticipationSession } from '../state/seasonParticipationSession';

/**
 * Season gate for account lifecycle. `unavailable` is only for tests and
 * older callers. Production derivation never returns it.
 * It does not mean there is no current Season.
 */
export type SeasonLifecycleSeamStatus =
  | 'unavailable'
  | 'loading'
  | 'error'
  | 'noCurrentSeason'
  | 'required'
  | 'ready';

export interface SeasonLifecycleSeam {
  status: SeasonLifecycleSeamStatus;
}

/** Pure projection. Does not expose the Season session to the lifecycle resolver. */
export function deriveSeasonLifecycleSeam(
  session: SeasonParticipationSession,
): SeasonLifecycleSeam {
  switch (session.status) {
    case 'idle':
    case 'loading':
      return { status: 'loading' };
    case 'error':
      return { status: 'error' };
    case 'noCurrentSeason':
      return { status: 'noCurrentSeason' };
    case 'setupRequired':
      return { status: 'required' };
    case 'ready':
      return { status: 'ready' };
    default: {
      const unexpected: never = session;
      return unexpected;
    }
  }
}
