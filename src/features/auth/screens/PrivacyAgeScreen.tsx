import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import { AuthPrimaryButton } from '../components/AuthPrimaryButton';
import { AuthScreenLayout } from '../components/AuthScreenLayout';
import { authCopy } from '../copy/authCopy';
import type {
  AccountCreationStackParamList,
  AuthStackParamList,
} from '../navigation/types';
import { parentalConsentCopy } from '../../parentalConsent/copy/parentalConsentCopy';
import { useParentalConsent } from '../../parentalConsent/hooks/useParentalConsent';
import { ParentalConsentError } from '../../parentalConsent/errors/parentalConsentError';

/**
 * Privacy boundary before email/password collection.
 * Does not persist age. Active under-13 consent is a local capability, not a DOB field.
 */
export function PrivacyAgeScreen(): React.JSX.Element {
  const navigation =
    useNavigation<NativeStackNavigationProp<AccountCreationStackParamList, 'PrivacyAge'>>();
  const {
    hasActiveConsent,
    needsFreshConsent,
    session,
    refreshStatus,
    resolveResumeDestination,
    clearSession,
  } = useParentalConsent();
  const [busy, setBusy] = useState(false);
  const [showThirteenPrompt, setShowThirteenPrompt] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.getParent()?.goBack();
  };

  const resumeUnderThirteen = async () => {
    setBusy(true);
    setErrorMessage(undefined);
    try {
      if (needsFreshConsent && !hasActiveConsent) {
        navigation.navigate('ParentConsentIntro');
        return;
      }
      if (!hasActiveConsent) {
        navigation.navigate('ParentConsentIntro');
        return;
      }
      const snapshot = await refreshStatus();
      if (!snapshot) {
        navigation.navigate('ConsentRecovery');
        return;
      }
      const destination = resolveResumeDestination(snapshot);
      if (destination === 'pending') {
        navigation.navigate('ConsentPending');
        return;
      }
      if (destination === 'createAccount') {
        navigation.navigate('CreateAccount');
        return;
      }
      if (destination === 'signInToClaim') {
        const parent = navigation.getParent<NativeStackNavigationProp<AuthStackParamList>>();
        parent?.replace('SignIn');
        return;
      }
      navigation.navigate('ConsentRecovery');
    } catch (error) {
      if (
        error instanceof ParentalConsentError &&
        (error.code === 'permission-denied' || error.code === 'not-found')
      ) {
        navigation.navigate('ConsentRecovery');
        return;
      }
      setErrorMessage(
        error instanceof ParentalConsentError
          ? error.message
          : parentalConsentCopy.errors.unexpected,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleThirteenOrOlder = () => {
    if (needsFreshConsent) {
      void resumeUnderThirteen();
      return;
    }
    if (hasActiveConsent) {
      setShowThirteenPrompt(true);
      return;
    }
    navigation.navigate('CreateAccount');
  };

  const confirmStartOver = () => {
    Alert.alert(
      parentalConsentCopy.privacyAge.startOverConfirmTitle,
      parentalConsentCopy.privacyAge.startOverConfirmBody,
      [
        {
          text: parentalConsentCopy.privacyAge.startOverCancel,
          style: 'cancel',
        },
        {
          text: parentalConsentCopy.privacyAge.startOverConfirm,
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await clearSession();
              setShowThirteenPrompt(false);
            })();
          },
        },
      ],
    );
  };

  const showActiveLanding = hasActiveConsent || needsFreshConsent;

  return (
    <AuthScreenLayout onBack={handleBack}>
      <View style={styles.header}>
        <Text style={styles.title}>{authCopy.privacyAge.title}</Text>
        <Text style={styles.supporting}>{authCopy.privacyAge.supporting}</Text>
      </View>
      <Text
        accessibilityRole="header"
        style={styles.question}
        testID="auth-privacy-age-question"
      >
        {authCopy.privacyAge.question}
      </Text>

      {showThirteenPrompt ? (
        <View style={styles.prompt} testID="auth-privacy-age-active-prompt">
          <Text style={styles.supporting}>
            {parentalConsentCopy.privacyAge.activeConsentPrompt}
          </Text>
          <AuthPrimaryButton
            testID="auth-privacy-age-continue-approval"
            label={parentalConsentCopy.privacyAge.continueApproval}
            onPress={() => {
              void resumeUnderThirteen();
            }}
            disabled={busy}
          />
          <AuthPrimaryButton
            testID="auth-privacy-age-start-over"
            label={parentalConsentCopy.privacyAge.startOver}
            variant="secondary"
            onPress={confirmStartOver}
            disabled={busy}
          />
        </View>
      ) : showActiveLanding ? (
        <View style={styles.prompt} testID="auth-privacy-age-restore">
          <Text style={styles.supporting}>
            {needsFreshConsent && !hasActiveConsent
              ? parentalConsentCopy.claimPending.terminal
              : parentalConsentCopy.privacyAge.activeConsentPrompt}
          </Text>
          <AuthPrimaryButton
            testID="auth-privacy-age-continue-approval"
            label={parentalConsentCopy.privacyAge.continueApproval}
            onPress={() => {
              void resumeUnderThirteen();
            }}
            disabled={busy || session.hydrateStatus !== 'ready'}
          />
          <AuthPrimaryButton
            testID="auth-privacy-age-thirteen-or-older"
            label={authCopy.privacyAge.thirteenOrOlder}
            variant="secondary"
            onPress={handleThirteenOrOlder}
            disabled={busy || session.hydrateStatus !== 'ready'}
          />
          {!needsFreshConsent ? (
            <AuthPrimaryButton
              testID="auth-privacy-age-start-over"
              label={parentalConsentCopy.privacyAge.startOver}
              variant="secondary"
              onPress={confirmStartOver}
              disabled={busy || session.hydrateStatus !== 'ready'}
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.actions}>
          <AuthPrimaryButton
            testID="auth-privacy-age-thirteen-or-older"
            label={authCopy.privacyAge.thirteenOrOlder}
            onPress={handleThirteenOrOlder}
            disabled={busy || session.hydrateStatus !== 'ready'}
          />
          <AuthPrimaryButton
            testID="auth-privacy-age-under-thirteen"
            label={authCopy.privacyAge.underThirteen}
            variant="secondary"
            onPress={() => {
              void resumeUnderThirteen();
            }}
            disabled={busy || session.hydrateStatus !== 'ready'}
          />
        </View>
      )}
      {errorMessage ? (
        <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.error}>
          {errorMessage}
        </Text>
      ) : null}
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },
  title: {
    ...typography.verseReference,
  },
  supporting: {
    ...typography.brandTagline,
  },
  question: {
    ...typography.title,
    marginTop: spacing.md,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  prompt: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  error: {
    ...typography.hint,
    marginTop: spacing.md,
  },
});
