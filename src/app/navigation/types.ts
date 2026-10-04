import type { NavigatorScreenParams } from '@react-navigation/native';

import type { ProfileStackParamList } from '../../features/profile/navigation/types';
import type { StudyStackParamList } from '../../features/study/navigation/types';

export type MainTabParamList = {
  Home: undefined;
  Study: NavigatorScreenParams<StudyStackParamList> | undefined;
  Practice: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

/**
 * Root groups follow the derived AccountLifecycleDestination (ADR-011):
 * initializing → IgniteEntry; unauthenticated → Auth;
 * resolving → QuizzerProfileLoading;
 * consentClaim → ConsentClaimPending;
 * profileOnboarding → QuizzerName; profileError → QuizzerProfileLoadError;
 * noCurrentSeason → NoCurrentSeason; seasonSetup → SeasonSetup;
 * main → MainTabs.
 * entitlementAccess has no screen until Sprint 4 and fail-closes to
 * QuizzerProfileLoading. No route-param payloads for lifecycle.
 */
export type RootStackParamList = {
  IgniteEntry: undefined;
  Auth: undefined;
  ConsentClaimPending: undefined;
  NoCurrentSeason: undefined;
  SeasonSetup: undefined;
  MainTabs: undefined;
  TournamentDetails: undefined;
  QuizzerName: undefined;
  QuizzerProfileLoadError: undefined;
  QuizzerProfileLoading: undefined;
};
