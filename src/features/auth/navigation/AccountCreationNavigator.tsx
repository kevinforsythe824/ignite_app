import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { CreateAccountScreen } from '../screens/CreateAccountScreen';
import { PrivacyAgeScreen } from '../screens/PrivacyAgeScreen';
import { UnderThirteenBlockedScreen } from '../screens/UnderThirteenBlockedScreen';
import type { AccountCreationStackParamList } from './types';

const Stack = createNativeStackNavigator<AccountCreationStackParamList>();

/**
 * Nested account-creation flow.
 * PrivacyAge is the initial route so email/password are not collected before
 * the privacy boundary. UnderThirteenBlocked is a terminal hold path.
 */
export function AccountCreationNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="PrivacyAge"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="PrivacyAge" component={PrivacyAgeScreen} />
      <Stack.Screen name="UnderThirteenBlocked" component={UnderThirteenBlockedScreen} />
      <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
    </Stack.Navigator>
  );
}
