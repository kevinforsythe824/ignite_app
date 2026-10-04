import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useMemo } from 'react';

import { AuthNavigator } from '../../features/auth/navigation/AuthNavigator';
import { IgniteEntryScreen } from '../../features/auth/screens/IgniteEntryScreen';
import { useAuth } from '../../features/auth';
import { hideNativeSplash } from '../../features/auth/splash/nativeSplash';
import { ConsentClaimPendingScreen } from '../../features/parentalConsent/screens/ConsentClaimPendingScreen';
import { QuizzerNameScreen } from '../../features/profile/screens/QuizzerNameScreen';
import { QuizzerProfileLoadErrorScreen } from '../../features/profile/screens/QuizzerProfileLoadErrorScreen';
import { QuizzerProfileLoadingScreen } from '../../features/profile/screens/QuizzerProfileLoadingScreen';
import { NoCurrentSeasonScreen } from '../../features/season/screens/NoCurrentSeasonScreen';
import {
  SeasonSetupRootDependenciesContext,
  SeasonSetupRootScreen,
  type SeasonSetupRootDependencies,
} from '../../features/season/screens/SeasonSetupRootScreen';
import type { QuizzerSeasonParticipationCreator } from '../../features/season/repositories/quizzerSeasonParticipationCreator';
import type { SeasonSetupCatalogRepository } from '../../features/season/repositories/seasonSetupCatalogRepository';
import TournamentDetailsScreen from '../../screens/TournamentDetailsScreen';
import { colors } from '../../shared/theme';
import {
  mapAccountLifecycleDestinationToRootScreen,
  useAccountLifecycleDestination,
  type FutureLifecycleSeam,
  type SeasonLifecycleSeam,
} from '../lifecycle';
import BottomTabNavigator from './BottomTabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const EMPTY_SEASON_SETUP_DEPENDENCIES: SeasonSetupRootDependencies = {};

export interface RootNavigatorProps {
  /** Test injection only. Production uses the Season participation session. */
  seasonSeam?: SeasonLifecycleSeam;
  /** Test injection only. Production entitlement stays unavailable until Sprint 4. */
  entitlementSeam?: FutureLifecycleSeam;
  /** Test injection only. Production Season Setup loads its own catalog. */
  seasonSetupCatalogRepository?: SeasonSetupCatalogRepository;
  /** Test injection only. Production Season Setup uses the participation callable. */
  seasonSetupParticipationCreator?: QuizzerSeasonParticipationCreator;
}

/**
 * Root stack switches on the derived account-lifecycle destination.
 * Authenticated remount key is `authenticated:${uid}` only — destination is not
 * part of the key. See ADR-011.
 */
export function RootNavigator({
  seasonSeam,
  entitlementSeam,
  seasonSetupCatalogRepository,
  seasonSetupParticipationCreator,
}: RootNavigatorProps = {}): React.JSX.Element {
  const { session } = useAuth();
  const destination = useAccountLifecycleDestination({
    seasonSeam,
    entitlementSeam,
  });
  const rootScreen = mapAccountLifecycleDestinationToRootScreen(destination);
  const seasonSetupDependencies = useMemo<SeasonSetupRootDependencies>(() => {
    if (
      seasonSetupCatalogRepository === undefined &&
      seasonSetupParticipationCreator === undefined
    ) {
      return EMPTY_SEASON_SETUP_DEPENDENCIES;
    }
    return {
      catalogRepository: seasonSetupCatalogRepository,
      participationCreator: seasonSetupParticipationCreator,
    };
  }, [seasonSetupCatalogRepository, seasonSetupParticipationCreator]);

  useEffect(() => {
    void hideNativeSplash();
  }, [session.status]);

  const navigatorKey =
    session.status === 'authenticated'
      ? `authenticated:${session.identity.uid}`
      : session.status;

  return (
    <SeasonSetupRootDependenciesContext.Provider value={seasonSetupDependencies}>
    <NavigationContainer>
      <Stack.Navigator
        key={navigatorKey}
        screenOptions={{
          headerShown: false,
          headerTintColor: colors.navy,
          contentStyle: { backgroundColor: colors.authBackgroundStart },
        }}
      >
        {rootScreen === 'IgniteEntry' ? (
          <Stack.Screen
            name="IgniteEntry"
            component={IgniteEntryScreen}
            options={{ contentStyle: { backgroundColor: colors.authBackgroundStart } }}
          />
        ) : rootScreen === 'Auth' ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : rootScreen === 'ConsentClaimPending' ? (
          <Stack.Screen name="ConsentClaimPending" component={ConsentClaimPendingScreen} />
        ) : rootScreen === 'MainTabs' ? (
          <>
            <Stack.Screen
              name="MainTabs"
              component={BottomTabNavigator}
              options={{ contentStyle: { backgroundColor: colors.background } }}
            />
            <Stack.Screen
              name="TournamentDetails"
              component={TournamentDetailsScreen}
              options={{
                headerShown: true,
                title: 'Tournament Details',
                contentStyle: { backgroundColor: colors.background },
              }}
            />
          </>
        ) : rootScreen === 'NoCurrentSeason' ? (
          <Stack.Screen name="NoCurrentSeason" component={NoCurrentSeasonScreen} />
        ) : rootScreen === 'SeasonSetup' ? (
          <Stack.Screen name="SeasonSetup" component={SeasonSetupRootScreen} />
        ) : rootScreen === 'QuizzerName' ? (
          <Stack.Screen name="QuizzerName" component={QuizzerNameScreen} />
        ) : rootScreen === 'QuizzerProfileLoadError' ? (
          <Stack.Screen
            name="QuizzerProfileLoadError"
            component={QuizzerProfileLoadErrorScreen}
          />
        ) : (
          <Stack.Screen name="QuizzerProfileLoading" component={QuizzerProfileLoadingScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </SeasonSetupRootDependenciesContext.Provider>
  );
}

export default RootNavigator;
