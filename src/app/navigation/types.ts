import type { NavigatorScreenParams } from '@react-navigation/native';

import type { ProfileStackParamList } from '../../features/profile/navigation/types';

export type MainTabParamList = {
  Home: undefined;
  Study: undefined;
  Practice: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

/**
 * Root groups follow AuthProvider session, parental-consent claim gate,
 * and QuizzerProfile presence:
 * initializing → IgniteEntry; unauthenticated → Auth;
 * authenticated + claim required → ConsentClaimPending;
 * authenticated + loading/idle → QuizzerProfileLoading;
 * authenticated + missing → QuizzerName; authenticated + error → QuizzerProfileLoadError;
 * authenticated + ready → MainTabs.
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
