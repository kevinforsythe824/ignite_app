import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';

import { AuthNavigator } from '../../features/auth/navigation/AuthNavigator';
import { IgniteEntryScreen } from '../../features/auth/screens/IgniteEntryScreen';
import { useAuth } from '../../features/auth';
import { hideNativeSplash } from '../../features/auth/splash/nativeSplash';
import { useQuizzerProfile } from '../../features/profile/state/QuizzerProfileProvider';
import { QuizzerNameScreen } from '../../features/profile/screens/QuizzerNameScreen';
import { QuizzerProfileLoadErrorScreen } from '../../features/profile/screens/QuizzerProfileLoadErrorScreen';
import { QuizzerProfileLoadingScreen } from '../../features/profile/screens/QuizzerProfileLoadingScreen';
import TournamentDetailsScreen from '../../screens/TournamentDetailsScreen';
import { colors } from '../../shared/theme';
import BottomTabNavigator from './BottomTabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root stack switches on AuthProvider session and QuizzerProfileProvider presence:
 * initializing → Ignite Entry
 * unauthenticated → Auth flow
 * authenticated + profile loading/idle → profile loading cover
 * authenticated + profile missing → Quizzer name onboarding
 * authenticated + profile error → recoverable load error
 * authenticated + profile ready → MainTabs
 *
 * Screens do not navigate around this gate after provisioning.
 */
export function RootNavigator(): React.JSX.Element {
  const { session } = useAuth();
  const { session: profileSession } = useQuizzerProfile();

  useEffect(() => {
    void hideNativeSplash();
  }, [session.status]);

  const authenticatedDestination =
    profileSession.status === 'ready'
      ? 'ready'
      : profileSession.status === 'missing'
        ? 'missing'
        : profileSession.status === 'error'
          ? 'error'
          : 'loading';

  return (
    <NavigationContainer>
      <Stack.Navigator
        key={
          session.status === 'authenticated'
            ? `authenticated:${authenticatedDestination}`
            : session.status
        }
        screenOptions={{
          headerShown: false,
          headerTintColor: colors.navy,
          contentStyle: { backgroundColor: colors.brandWarmBackground },
        }}
      >
        {session.status === 'initializing' ? (
          <Stack.Screen name="IgniteEntry" component={IgniteEntryScreen} />
        ) : session.status === 'unauthenticated' ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : authenticatedDestination === 'ready' ? (
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
        ) : authenticatedDestination === 'missing' ? (
          <Stack.Screen name="QuizzerName" component={QuizzerNameScreen} />
        ) : authenticatedDestination === 'error' ? (
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
