/**
 * Derived account-lifecycle destination. Not persisted. Not an onboarding flag.
 * RootNavigator is the only consumer; Auth, consent, and profile stay in their providers.
 */

export type AccountLifecycleAuthStatus =
  | 'initializing'
  | 'unauthenticated'
  | 'authenticated';

export type AccountLifecycleConsentHydrateStatus = 'idle' | 'hydrating' | 'ready';

export type AccountLifecycleProfileStatus =
  | 'idle'
  | 'loading'
  | 'missing'
  | 'ready'
  | 'error';

export type FutureLifecycleSeamStatus =
  | 'unavailable'
  | 'loading'
  | 'error'
  | 'required'
  | 'ready';

/**
 * Dormant Sprint 3/4 input. `unavailable` means the owning sprint has not
 * shipped a source of truth — skip the gate. Never invent Firestore records.
 */
export interface FutureLifecycleSeam {
  status: FutureLifecycleSeamStatus;
}

export type AccountLifecycleDestination =
  | 'initializing'
  | 'unauthenticated'
  | 'resolving'
  | 'consentClaim'
  | 'profileOnboarding'
  | 'profileError'
  | 'main'
  | 'seasonSetup'
  | 'entitlementAccess';

export interface AccountLifecycleInput {
  authStatus: AccountLifecycleAuthStatus;
  authenticatedUid: string | null;
  consentHydrateStatus: AccountLifecycleConsentHydrateStatus;
  isClaimRequired: boolean;
  profileStatus: AccountLifecycleProfileStatus;
  profileQuizzerId: string | null;
  seasonSeam: FutureLifecycleSeam;
  entitlementSeam: FutureLifecycleSeam;
}
