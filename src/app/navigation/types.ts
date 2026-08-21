export type MainTabParamList = {
  Home: undefined;
  Study: undefined;
  Practice: undefined;
  Profile: undefined;
};

/**
 * Root groups follow AuthProvider session.
 * Later Sprint 2 onboarding/profile-missing groups insert beside the authenticated screens.
 */
export type RootStackParamList = {
  IgniteEntry: undefined;
  Auth: undefined;
  MainTabs: undefined;
  TournamentDetails: undefined;
};
