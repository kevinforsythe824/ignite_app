import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../../../shared/theme';
import { QuizzerAvatar } from '../components/QuizzerAvatar';
import { SettingsRow } from '../components/SettingsRow';
import { SettingsSection } from '../components/SettingsSection';
import { quizzerProfileCopy } from '../copy/quizzerProfileCopy';
import type { ProfileStackParamList } from '../navigation/types';
import { useQuizzerProfile } from '../state/QuizzerProfileProvider';

type ProfileHomeNavigation = NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>;

const NAME_FONT_SIZE = 24;
const NAME_LINE_HEIGHT = 32;

/**
 * Permanent Profile foundation: name, initials avatar, Settings entry.
 * RootNavigator + Phase 7 resolver remain authoritative for whether Profile can render.
 * Non-ready is an invariant/defensive fallback only — not a second lifecycle or navigator.
 */
export function ProfileHomeScreen(): React.JSX.Element {
  const navigation = useNavigation<ProfileHomeNavigation>();
  const { session } = useQuizzerProfile();

  if (session.status !== 'ready') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']} testID="profile-home-canvas">
        <View style={styles.content}>
          <Text accessibilityRole="header" style={styles.title}>
            {quizzerProfileCopy.profile.title}
          </Text>
          <Text
            accessibilityLiveRegion="polite"
            style={styles.unavailable}
            testID="profile-home-unavailable"
          >
            {quizzerProfileCopy.profile.unavailable}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { firstName, lastName } = session.profile;
  const fullName = `${firstName} ${lastName}`.trim();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']} testID="profile-home-canvas">
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title} testID="profile-home-title">
          {quizzerProfileCopy.profile.title}
        </Text>
        <View style={styles.identity}>
          <QuizzerAvatar firstName={firstName} lastName={lastName} />
          <Text style={styles.name} testID="profile-home-full-name">
            {fullName}
          </Text>
        </View>
        <SettingsSection testID="profile-home-settings-card">
          <SettingsRow
            icon="settings-outline"
            label={quizzerProfileCopy.profile.settings}
            onPress={() => navigation.navigate('Settings')}
            testID="profile-home-settings"
          />
        </SettingsSection>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.xl,
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
  unavailable: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    paddingTop: spacing.lg,
  },
  identity: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  name: {
    ...typography.screenTitle,
    fontSize: NAME_FONT_SIZE,
    lineHeight: NAME_LINE_HEIGHT,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
