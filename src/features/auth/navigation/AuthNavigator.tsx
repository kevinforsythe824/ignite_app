import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { SignInScreen } from '../screens/SignInScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { AccountCreationNavigator } from './AccountCreationNavigator';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="AccountCreation" component={AccountCreationNavigator} />
    </Stack.Navigator>
  );
}
