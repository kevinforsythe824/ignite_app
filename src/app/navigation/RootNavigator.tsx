import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';

import { AuthNavigator } from '../../features/auth/navigation/AuthNavigator';
import { IgniteEntryScreen } from '../../features/auth/screens/IgniteEntryScreen';
import { useAuth } from '../../features/auth';
import { hideNativeSplash } from '../../features/auth/splash/nativeSplash';
import { ConsentClaimPendingScreen } from '../../features/parentalConsent/screens/ConsentClaimPendingScreen';
import { QuizzerNameScreen } from '../../features/profile/screens/QuizzerNameScreen';
import { QuizzerProfileLoadErrorScreen } from '../../features/profile/screens/QuizzerProfileLoadErrorScreen';
import { QuizzerProfileLoadingScreen } from '../../features/profile/screens/QuizzerProfileLoadingScreen';
import TournamentDetailsScreen from '../../screens/TournamentDetailsScreen';
import { colors } from '../../shared/theme';
import {
  mapAccountLifecycleDestinationToRootScreen,
  useAccountLifecycleDestination,
  type FutureLifecycleSeam,
} from '../lifecycle';
import BottomTabNavigator from './BottomTabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export interface RootNavigatorProps {
  /** Test injection only. Production always uses unavailable seams. */
  seasonSeam?: FutureLifecycleSeam;
  /** Test injection only. Production always uses unavailable seams. */
  entitlementSeam?: FutureLifecycleSeam;
}

/**
 * Root stack switches on the derived account-lifecycle destination.
 * Authenticated remount key is `authenticated:${uid}` only — destination is not
 * part of the key. See ADR-011.
 */
export function RootNavigator({
  seasonSeam,
  entitlementSeam,
}: RootNavigatorProps = {}): React.JSX.Element {
  const { session } = useAuth();
  const destination = useAccountLifecycleDestination({
    seasonSeam,
    entitlementSeam,
  });
  const rootScreen = mapAccountLifecycleDestinationToRootScreen(destination);

  useEffect(() => {
    void hideNativeSplash();
  }, [session.status]);

  const navigatorKey =
    session.status === 'authenticated'
      ? `authenticated:${session.identity.uid}`
      : session.status;

  return (
    <NavigationContainer>
      <Stack.Navigator
        key={navigatorKey}
        screenOptions={{
          headerShown: false,
          headerTintColor: colors.navy,
          contentStyle: { backgroundColor: colors.brandWarmBackground },
        }}
      >
        {rootScreen === 'IgniteEntry' ? (
          <Stack.Screen name="IgniteEntry" component={IgniteEntryScreen} />
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
  );
}

export default RootNavigator;
