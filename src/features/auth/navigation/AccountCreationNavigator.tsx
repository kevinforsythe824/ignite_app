import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { ConsentChangeEmailScreen } from '../../parentalConsent/screens/ConsentChangeEmailScreen';
import { ConsentPendingScreen } from '../../parentalConsent/screens/ConsentPendingScreen';
import { ConsentRecoveryScreen } from '../../parentalConsent/screens/ConsentRecoveryScreen';
import { ParentConsentIntroScreen } from '../../parentalConsent/screens/ParentConsentIntroScreen';
import { ParentEmailScreen } from '../../parentalConsent/screens/ParentEmailScreen';
import { CreateAccountScreen } from '../screens/CreateAccountScreen';
import { PrivacyAgeScreen } from '../screens/PrivacyAgeScreen';
import type { AccountCreationStackParamList } from './types';

const Stack = createNativeStackNavigator<AccountCreationStackParamList>();

/**
 * Nested account-creation flow.
 * PrivacyAge is the initial route so email/password are not collected before
 * the privacy boundary. Under-13 continues through parental consent screens.
 */
export function AccountCreationNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="PrivacyAge"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="PrivacyAge" component={PrivacyAgeScreen} />
      <Stack.Screen name="ParentConsentIntro" component={ParentConsentIntroScreen} />
      <Stack.Screen name="ParentEmail" component={ParentEmailScreen} />
      <Stack.Screen name="ConsentPending" component={ConsentPendingScreen} />
      <Stack.Screen name="ConsentChangeEmail" component={ConsentChangeEmailScreen} />
      <Stack.Screen name="ConsentRecovery" component={ConsentRecoveryScreen} />
      <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
    </Stack.Navigator>
  );
}
