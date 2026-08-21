import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';

import { AuthNavigator } from '../../features/auth/navigation/AuthNavigator';
import { IgniteEntryScreen } from '../../features/auth/screens/IgniteEntryScreen';
import { useAuth } from '../../features/auth';
import { hideNativeSplash } from '../../features/auth/splash/nativeSplash';
import TournamentDetailsScreen from '../../screens/TournamentDetailsScreen';
import { colors } from '../../shared/theme';
import BottomTabNavigator from './BottomTabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root stack switches on AuthProvider session:
 * initializing → Ignite Entry
 * unauthenticated → Auth flow
 * authenticated → existing MainTabs (later Sprint 2 onboarding groups insert here)
 *
 * Hides the native splash once this navigator can paint the first auth-gated frame.
 * Does not delay routing or alter AuthProvider semantics.
 */
export function RootNavigator(): React.JSX.Element {
  const { session } = useAuth();

  useEffect(() => {
    void hideNativeSplash();
  }, [session.status]);

  return (
    <NavigationContainer>
      <Stack.Navigator
        key={session.status}
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
        ) : (
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
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default RootNavigator;
