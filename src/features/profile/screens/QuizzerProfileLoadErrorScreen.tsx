import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import { useAuth } from '../../auth';
import { AuthPrimaryButton } from '../../auth/components/AuthPrimaryButton';
import { AuthScreenLayout } from '../../auth/components/AuthScreenLayout';
import { AuthTextLink } from '../../auth/components/AuthTextLink';
import { quizzerProfileCopy } from '../copy/quizzerProfileCopy';
import { useQuizzerProfile } from '../state/QuizzerProfileProvider';

/**
 * Recoverable profile-resolution failure.
 * Never treated as missing profile / name onboarding.
 */
export function QuizzerProfileLoadErrorScreen(): React.JSX.Element {
  const { signOut } = useAuth();
  const { session, retry } = useQuizzerProfile();
  const [busy, setBusy] = useState(false);

  const detail =
    session.status === 'error' ? session.error.message : quizzerProfileCopy.loadError.supporting;

  const handleRetry = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await retry();
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreenLayout>
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={styles.title}
          testID="quizzer-profile-load-error-title"
        >
          {quizzerProfileCopy.loadError.title}
        </Text>
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.supporting}
        >
          {detail}
        </Text>
      </View>
      <View style={styles.actions}>
        <AuthPrimaryButton
          testID="quizzer-profile-load-error-retry"
          label={quizzerProfileCopy.loadError.tryAgain}
          onPress={() => {
            void handleRetry();
          }}
          loading={busy}
          disabled={busy}
        />
        <AuthTextLink
          testID="quizzer-profile-load-error-sign-out"
          label={quizzerProfileCopy.actions.signOut}
          disabled={busy}
          onPress={() => {
            void handleSignOut();
          }}
        />
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.verseReference,
  },
  supporting: {
    ...typography.brandTagline,
  },
  actions: {
    gap: spacing.md,
  },
});
