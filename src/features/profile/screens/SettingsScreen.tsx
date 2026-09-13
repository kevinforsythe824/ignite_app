import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import { AuthenticationError, useAuth } from '../../auth';
import { AuthPrimaryButton } from '../../auth/components/AuthPrimaryButton';
import { SettingsRow, settingsRowLayout } from '../components/SettingsRow';
import { SettingsSection } from '../components/SettingsSection';
import { quizzerProfileCopy } from '../copy/quizzerProfileCopy';
import type { ProfileStackParamList } from '../navigation/types';

type SettingsNavigation = NativeStackNavigationProp<ProfileStackParamList, 'Settings'>;

/**
 * Account Settings foundation under Profile.
 *
 * On focus, best-effort refreshIdentity so a completed verify-before-update email
 * link can surface the new address. Same-uid refresh must not disturb QuizzerProfile
 * (provider is keyed to uid). Failures keep the last known AuthenticatedIdentity.
 */
export function SettingsScreen(): React.JSX.Element {
  const navigation = useNavigation<SettingsNavigation>();
  const { identity, signOut, refreshIdentity } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | undefined>();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void (async () => {
        try {
          await refreshIdentity();
        } catch {
          // Intentional: retain the last known AuthenticatedIdentity.
          // A failed background refresh after email verification must not
          // unmount Settings or reset QuizzerProfile.
          if (cancelled) {
            return;
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [refreshIdentity]),
  );

  const handleSignOut = async () => {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    setSignOutError(undefined);
    try {
      await signOut();
    } catch (error) {
      setSignOutError(
        error instanceof AuthenticationError
          ? error.message
          : quizzerProfileCopy.settings.signOutFailed,
      );
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      testID="settings-scroll"
    >
      <SettingsSection
        title={quizzerProfileCopy.settings.personalInformation}
        testID="settings-section-personal"
      >
        <View style={styles.emailRow} testID="settings-email">
          <Ionicons
            name="at-outline"
            size={settingsRowLayout.iconSize}
            color={colors.textPrimary}
          />
          <View style={styles.emailBlock}>
            <Text style={styles.emailLabel}>{quizzerProfileCopy.settings.emailLabel}</Text>
            <Text style={styles.emailValue}>{identity?.email ?? '—'}</Text>
          </View>
        </View>
        <SettingsRow
          icon="person-outline"
          label={quizzerProfileCopy.settings.editName}
          onPress={() => navigation.navigate('EditName')}
          testID="settings-edit-name"
        />
        <SettingsRow
          icon="mail-outline"
          label={quizzerProfileCopy.settings.changeEmail}
          onPress={() => navigation.navigate('ChangeEmail')}
          testID="settings-change-email"
        />
        <SettingsRow
          icon="lock-closed-outline"
          label={quizzerProfileCopy.settings.changePassword}
          onPress={() => navigation.navigate('ChangePassword')}
          testID="settings-change-password"
        />
      </SettingsSection>

      <SettingsSection title={quizzerProfileCopy.settings.support} testID="settings-section-support">
        <SettingsRow
          icon="help-circle-outline"
          label={quizzerProfileCopy.settings.helpAndFeedback}
          onPress={() => navigation.navigate('HelpAndFeedback')}
          testID="settings-help-feedback"
        />
        <SettingsRow
          icon="information-circle-outline"
          label={quizzerProfileCopy.settings.about}
          onPress={() => navigation.navigate('About')}
          testID="settings-about"
        />
      </SettingsSection>

      {signOutError ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.signOutError}
          testID="settings-sign-out-error"
        >
          {signOutError}
        </Text>
      ) : null}

      <View style={styles.signOutBlock}>
        <AuthPrimaryButton
          label={
            signingOut
              ? quizzerProfileCopy.settings.signingOut
              : quizzerProfileCopy.settings.signOut
          }
          onPress={() => {
            void handleSignOut();
          }}
          loading={signingOut}
          loadingLabel={quizzerProfileCopy.settings.signingOut}
          variant="secondary"
          testID="settings-sign-out"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.screenPaddingH,
    gap: spacing.lg,
  },
  emailRow: {
    minHeight: spacing.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: settingsRowLayout.paddingVertical,
    paddingHorizontal: settingsRowLayout.paddingHorizontal,
    gap: settingsRowLayout.gap,
  },
  emailBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  emailLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  emailValue: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  signOutError: {
    ...typography.error,
    color: colors.danger,
  },
  signOutBlock: {
    marginTop: spacing.sm,
  },
});
