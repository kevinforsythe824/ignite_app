import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { CreateAccountScreen } from '../screens/CreateAccountScreen';
import type { AccountCreationStackParamList } from './types';

const Stack = createNativeStackNavigator<AccountCreationStackParamList>();

/**
 * Nested account-creation flow.
 * Phase 3 initial route is CreateAccount. A future approved privacy/age
 * screen can become the initial route here without changing Welcome.
 */
export function AccountCreationNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="CreateAccount"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
    </Stack.Navigator>
  );
}
