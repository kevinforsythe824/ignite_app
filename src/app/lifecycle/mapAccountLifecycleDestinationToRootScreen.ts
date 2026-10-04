import type { RootStackParamList } from '../navigation/types';
import type { AccountLifecycleDestination } from './accountLifecycleDestination';

export type AccountLifecycleRootScreen = keyof RootStackParamList;

/**
 * Maps a derived destination to a root stack screen.
 * `entitlementAccess` has no screen until Sprint 4 and fail-closes to the loading cover.
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
    case 'noCurrentSeason':
      return 'NoCurrentSeason';
    case 'seasonSetup':
      return 'SeasonSetup';
    case 'main':
      return 'MainTabs';
    case 'resolving':
    case 'entitlementAccess':
      return 'QuizzerProfileLoading';
  }
}
