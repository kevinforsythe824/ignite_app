import { useAuth } from '../../features/auth';
import { useParentalConsent } from '../../features/parentalConsent/hooks/useParentalConsent';
import { useQuizzerProfile } from '../../features/profile/state/QuizzerProfileProvider';
import { deriveSeasonLifecycleSeam } from '../../features/season/application/deriveSeasonLifecycleSeam';
import type { SeasonLifecycleSeam } from '../../features/season/application/deriveSeasonLifecycleSeam';
import { useSeasonParticipation } from '../../features/season/state/SeasonParticipationProvider';
import type {
  AccountLifecycleDestination,
  FutureLifecycleSeam,
} from './accountLifecycleDestination';
import { UNAVAILABLE_LIFECYCLE_SEAM } from './futureLifecycleSeams';
import { resolveAccountLifecycleDestination } from './resolveAccountLifecycleDestination';

export interface UseAccountLifecycleDestinationOptions {
  /** Test override. Production uses the Season participation session. */
  seasonSeam?: SeasonLifecycleSeam;
  /** Test override. Production entitlement stays unavailable until Sprint 4. */
  entitlementSeam?: FutureLifecycleSeam;
}

/**
 * Composes Auth, parental consent, Quizzer profile, and the Season session
 * into a destination. Does not own those sessions.
 * Entitlement stays unavailable until Sprint 4.
 */
export function useAccountLifecycleDestination(
  options: UseAccountLifecycleDestinationOptions = {},
): AccountLifecycleDestination {
  const { session: authSession } = useAuth();
  const { isClaimRequired, session: consentSession } = useParentalConsent();
  const { session: profileSession } = useQuizzerProfile();
  const { session: seasonSession } = useSeasonParticipation();

  const authenticatedUid =
    authSession.status === 'authenticated' ? authSession.identity.uid : null;
  const profileQuizzerId =
    profileSession.status === 'idle' ? null : profileSession.quizzerId;

  return resolveAccountLifecycleDestination({
    authStatus: authSession.status,
    authenticatedUid,
    consentHydrateStatus: consentSession.hydrateStatus,
    isClaimRequired,
    profileStatus: profileSession.status,
    profileQuizzerId,
    seasonSeam: options.seasonSeam ?? deriveSeasonLifecycleSeam(seasonSession),
    entitlementSeam: options.entitlementSeam ?? UNAVAILABLE_LIFECYCLE_SEAM,
  });
}
