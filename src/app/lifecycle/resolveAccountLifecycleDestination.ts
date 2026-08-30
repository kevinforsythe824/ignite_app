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
 * Future seams without a real screen fail closed to `resolving` so RootNavigator
 * cannot treat them as `main`. `required` is the Sprint 3/4 contract destination.
 */
function destinationForFutureSeam(
  seam: FutureLifecycleSeam,
  requiredDestination: 'seasonSetup' | 'entitlementAccess',
): AccountLifecycleDestination | null {
  if (seam.status === 'unavailable' || seam.status === 'ready') {
    return null;
  }
  if (seam.status === 'required') {
    return requiredDestination;
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

  const seasonDestination = destinationForFutureSeam(input.seasonSeam, 'seasonSetup');
  if (seasonDestination !== null) {
    return seasonDestination;
  }

  const entitlementDestination = destinationForFutureSeam(
    input.entitlementSeam,
    'entitlementAccess',
  );
  if (entitlementDestination !== null) {
    return entitlementDestination;
  }

  return 'main';
}
