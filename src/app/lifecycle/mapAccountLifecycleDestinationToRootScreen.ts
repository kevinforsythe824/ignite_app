import type { RootStackParamList } from '../navigation/types';
import type { AccountLifecycleDestination } from './accountLifecycleDestination';

export type AccountLifecycleRootScreen = keyof RootStackParamList;

/**
 * Maps a derived destination to a root stack screen.
 * `seasonSetup` and `entitlementAccess` have no screens in Phase 7 —
 * fail closed to the loading cover so they never fall through to MainTabs.
 */
export function mapAccountLifecycleDestinationToRootScreen(
  destination: AccountLifecycleDestination,
): AccountLifecycleRootScreen {
  switch (destination) {
    case 'initializing':
      return 'IgniteEntry';
    case 'unauthenticated':
      return 'Auth';
    case 'consentClaim':
      return 'ConsentClaimPending';
    case 'profileOnboarding':
      return 'QuizzerName';
    case 'profileError':
      return 'QuizzerProfileLoadError';
    case 'main':
      return 'MainTabs';
    case 'resolving':
    case 'seasonSetup':
    case 'entitlementAccess':
      return 'QuizzerProfileLoading';
  }
}
