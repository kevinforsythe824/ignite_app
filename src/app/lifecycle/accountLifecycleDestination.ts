import type { SeasonLifecycleSeam } from '../../features/season/application/deriveSeasonLifecycleSeam';

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
 * Entitlement seam until Sprint 4. `unavailable` means that gate is not active.
 * It does not mean there is no current Season.
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
  | 'noCurrentSeason'
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
  seasonSeam: SeasonLifecycleSeam;
  entitlementSeam: FutureLifecycleSeam;
}
