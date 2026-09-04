import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import { AuthenticationError, useAuth } from '../../auth';
import { AuthPrimaryButton } from '../../auth/components/AuthPrimaryButton';
import { SettingsRow } from '../components/SettingsRow';
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
    >
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{quizzerProfileCopy.settings.emailLabel}</Text>
        <View style={styles.emailCard} testID="settings-email">
          <Text style={styles.emailValue}>{identity?.email ?? '—'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <SettingsRow
          label={quizzerProfileCopy.settings.editName}
          onPress={() => navigation.navigate('EditName')}
          testID="settings-edit-name"
        />
        <SettingsRow
          label={quizzerProfileCopy.settings.changeEmail}
          onPress={() => navigation.navigate('ChangeEmail')}
          testID="settings-change-email"
        />
        <SettingsRow
          label={quizzerProfileCopy.settings.changePassword}
          onPress={() => navigation.navigate('ChangePassword')}
          testID="settings-change-password"
        />
        <SettingsRow
          label={quizzerProfileCopy.settings.helpAndFeedback}
          onPress={() => navigation.navigate('HelpAndFeedback')}
          testID="settings-help-feedback"
        />
        <SettingsRow
          label={quizzerProfileCopy.settings.about}
          onPress={() => navigation.navigate('About')}
          testID="settings-about"
        />
      </View>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.screenPaddingH,
    gap: spacing.xl,
  },
  section: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.cardWhite,
  },
  sectionLabel: {
    ...typography.hint,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  emailCard: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  emailValue: {
    ...typography.valueBody,
    color: colors.navy,
  },
  signOutError: {
    ...typography.hint,
    color: colors.accentRed,
  },
});
