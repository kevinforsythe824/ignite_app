import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../../../shared/theme';
import { AuthPrimaryButton } from '../../auth/components/AuthPrimaryButton';
import { QuizzerAvatar } from '../components/QuizzerAvatar';
import { quizzerProfileCopy } from '../copy/quizzerProfileCopy';
import type { ProfileStackParamList } from '../navigation/types';
import { useQuizzerProfile } from '../state/QuizzerProfileProvider';

type ProfileHomeNavigation = NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>;

/**
 * Permanent Profile foundation: name, initials avatar, Settings entry.
 * Rendered only when QuizzerProfileProvider is ready (RootNavigator gate).
 */
export function ProfileHomeScreen(): React.JSX.Element {
  const navigation = useNavigation<ProfileHomeNavigation>();
  const { session } = useQuizzerProfile();

  if (session.status !== 'ready') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.content} />
      </SafeAreaView>
    );
  }

  const { firstName, lastName } = session.profile;
  const fullName = `${firstName} ${lastName}`.trim();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
        <AuthPrimaryButton
          label={quizzerProfileCopy.profile.settings}
          onPress={() => navigation.navigate('Settings')}
          testID="profile-home-settings"
        />
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
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  title: {
    ...typography.verseReference,
    color: colors.navy,
  },
  identity: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  name: {
    ...typography.title,
    fontSize: 22,
    color: colors.navy,
    textAlign: 'center',
  },
});
