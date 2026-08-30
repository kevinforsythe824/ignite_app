import { useAuth } from '../../features/auth';
import { useParentalConsent } from '../../features/parentalConsent/hooks/useParentalConsent';
import { useQuizzerProfile } from '../../features/profile/state/QuizzerProfileProvider';
import type {
  AccountLifecycleDestination,
  FutureLifecycleSeam,
} from './accountLifecycleDestination';
import { UNAVAILABLE_LIFECYCLE_SEAM } from './futureLifecycleSeams';
import { resolveAccountLifecycleDestination } from './resolveAccountLifecycleDestination';

export interface UseAccountLifecycleDestinationOptions {
  seasonSeam?: FutureLifecycleSeam;
  entitlementSeam?: FutureLifecycleSeam;
}

/**
 * Composes Auth, parental-consent, and Quizzer profile sessions into a
 * destination. Does not own those sessions. Production seams stay unavailable.
 */
export function useAccountLifecycleDestination(
  options: UseAccountLifecycleDestinationOptions = {},
): AccountLifecycleDestination {
  const { session: authSession } = useAuth();
  const { isClaimRequired, session: consentSession } = useParentalConsent();
  const { session: profileSession } = useQuizzerProfile();

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
    seasonSeam: options.seasonSeam ?? UNAVAILABLE_LIFECYCLE_SEAM,
    entitlementSeam: options.entitlementSeam ?? UNAVAILABLE_LIFECYCLE_SEAM,
  });
}
