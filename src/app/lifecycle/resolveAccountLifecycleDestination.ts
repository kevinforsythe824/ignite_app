import type { SeasonLifecycleSeam } from '../../features/season/application/deriveSeasonLifecycleSeam';
import type {
  AccountLifecycleDestination,
  AccountLifecycleInput,
  FutureLifecycleSeam,
} from './accountLifecycleDestination';

function profileSessionMatchesUid(
  profileQuizzerId: string | null,
  authenticatedUid: string,
): boolean {
  return profileQuizzerId === authenticatedUid;
}

/**
 * `unavailable` skips the Season gate for tests. Production derivation does not use it.
 * `noCurrentSeason` is its own destination. Loading and error stay on the resolving cover.
 */
function destinationForSeasonSeam(
  seam: SeasonLifecycleSeam,
): AccountLifecycleDestination | null {
  switch (seam.status) {
    case 'unavailable':
    case 'ready':
      return null;
    case 'required':
      return 'seasonSetup';
    case 'noCurrentSeason':
      return 'noCurrentSeason';
    case 'loading':
    case 'error':
      return 'resolving';
    default: {
      const unexpected: never = seam.status;
      return unexpected;
    }
  }
}

/**
 * Entitlement has no screen in Sprint 3. `required` stays fail-closed until Sprint 4.
 */
function destinationForEntitlementSeam(
  seam: FutureLifecycleSeam,
): AccountLifecycleDestination | null {
  if (seam.status === 'unavailable' || seam.status === 'ready') {
    return null;
  }
  if (seam.status === 'required') {
    return 'entitlementAccess';
  }
  return 'resolving';
}

/**
 * Pure account-lifecycle routing table. First match wins.
 * Security/privacy gates (auth, consent hydrate, claim) beat profile and seams.
 */
export function resolveAccountLifecycleDestination(
  input: AccountLifecycleInput,
): AccountLifecycleDestination {
  if (input.authStatus === 'initializing') {
    return 'initializing';
  }

  if (input.authStatus === 'unauthenticated' || input.authenticatedUid === null) {
    return 'unauthenticated';
  }

  const currentUid = input.authenticatedUid;

  if (input.consentHydrateStatus !== 'ready') {
    return 'resolving';
  }

  if (input.isClaimRequired) {
    return 'consentClaim';
  }

  if (
    (input.profileStatus === 'missing' ||
      input.profileStatus === 'ready' ||
      input.profileStatus === 'error') &&
    !profileSessionMatchesUid(input.profileQuizzerId, currentUid)
  ) {
    return 'resolving';
  }

  if (input.profileStatus === 'idle' || input.profileStatus === 'loading') {
    return 'resolving';
  }

  if (input.profileStatus === 'error') {
    return 'profileError';
  }

  if (input.profileStatus === 'missing') {
    return 'profileOnboarding';
  }

  const seasonDestination = destinationForSeasonSeam(input.seasonSeam);
  if (seasonDestination !== null) {
    return seasonDestination;
  }

  const entitlementDestination = destinationForEntitlementSeam(input.entitlementSeam);
  if (entitlementDestination !== null) {
    return entitlementDestination;
  }

  return 'main';
}
