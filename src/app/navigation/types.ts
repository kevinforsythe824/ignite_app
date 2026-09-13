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
 * main → MainTabs.
 * seasonSetup / entitlementAccess have no screens yet — fail closed to
 * QuizzerProfileLoading. No route-param payloads for lifecycle.
 */
export type RootStackParamList = {
  IgniteEntry: undefined;
  Auth: undefined;
  ConsentClaimPending: undefined;
  MainTabs: undefined;
  TournamentDetails: undefined;
  QuizzerName: undefined;
  QuizzerProfileLoadError: undefined;
  QuizzerProfileLoading: undefined;
};
