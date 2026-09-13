import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import { authCopy } from '../../auth/copy/authCopy';
import { FeedbackComposeScreen } from '../../feedback/screens/FeedbackComposeScreen';
import { HelpAndFeedbackScreen } from '../../feedback/screens/HelpAndFeedbackScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { ChangeEmailScreen } from '../screens/ChangeEmailScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { EditNameScreen } from '../screens/EditNameScreen';
import { ProfileHomeScreen } from '../screens/ProfileHomeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import type { ProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

const BACK_CHEVRON_SIZE = 24;

function ProfileStackBackButton({ onPress }: { onPress: () => void }): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={authCopy.actions.back}
      style={styles.backButton}
    >
      <Ionicons name="chevron-back" size={BACK_CHEVRON_SIZE} color={colors.textPrimary} />
    </Pressable>
  );
}

/** Nested stack under the Profile tab: home + Settings subflows. */
export function ProfileStackNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="ProfileHome"
      screenOptions={({ navigation }) => ({
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontFamily: typography.stackTitle.fontFamily,
          fontSize: typography.stackTitle.fontSize,
          fontWeight: typography.stackTitle.fontWeight,
          color: colors.textPrimary,
        },
        headerStyle: { backgroundColor: colors.background },
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        // Fallback if the system back control is ever shown: chevron only, no prior-route title.
        headerBackButtonDisplayMode: 'minimal',
        // Replaces the iOS 26 liquid-glass system back button. Android uses this path.
        headerLeft: ({ canGoBack }) =>
          canGoBack ? <ProfileStackBackButton onPress={() => navigation.goBack()} /> : null,
        // iOS 26 wraps headerLeft in a shared-background capsule unless this flag is set.
        unstable_headerLeftItems: ({ canGoBack }) =>
          canGoBack
            ? [
                {
                  type: 'custom' as const,
                  hidesSharedBackground: true,
                  element: <ProfileStackBackButton onPress={() => navigation.goBack()} />,
                },
              ]
            : [],
      })}
    >
      <Stack.Screen
        name="ProfileHome"
        component={ProfileHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="EditName" component={EditNameScreen} options={{ title: 'Edit Name' }} />
      <Stack.Screen
        name="ChangeEmail"
        component={ChangeEmailScreen}
        options={{ title: 'Change Email' }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: 'Change Password' }}
      />
      <Stack.Screen
        name="HelpAndFeedback"
        component={HelpAndFeedbackScreen}
        options={{ title: 'Help & Feedback' }}
      />
      <Stack.Screen
        name="FeedbackCompose"
        component={FeedbackComposeScreen}
        options={{ title: 'Feedback' }}
      />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  backButton: {
    minWidth: spacing.minTouchTarget,
    minHeight: spacing.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
