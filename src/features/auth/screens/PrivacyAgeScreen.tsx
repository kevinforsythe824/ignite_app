import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import { AuthPrimaryButton } from '../components/AuthPrimaryButton';
import { AuthScreenLayout } from '../components/AuthScreenLayout';
import { AuthTextField } from '../components/AuthTextField';
import { authCopy } from '../copy/authCopy';
import type {
  AccountCreationStackParamList,
  AuthStackParamList,
} from '../navigation/types';
import {
  parsePrivacyAgeInput,
  resolvePrivacyAgeRoute,
} from '../validation/privacyAgeValidation';
import { parentalConsentCopy } from '../../parentalConsent/copy/parentalConsentCopy';
import { ParentalConsentError } from '../../parentalConsent/errors/parentalConsentError';
import { useParentalConsent } from '../../parentalConsent/hooks/useParentalConsent';

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
  const submittingRef = useRef(false);
  const [showThirteenPrompt, setShowThirteenPrompt] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [ageText, setAgeText] = useState('');
  const [touched, setTouched] = useState(false);

  const isHydrated = session.hydrateStatus === 'ready';
  const parsed = parsePrivacyAgeInput(ageText);
  const isValidAge = parsed.status === 'integer';
  const ageRoute = isValidAge ? resolvePrivacyAgeRoute(parsed.age) : null;
  const showInlineValidationError = touched && !isValidAge;
  const inlineValidationError = showInlineValidationError
    ? authCopy.privacyAge.wholeNumber
    : undefined;

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.getParent()?.goBack();
  };

  const resumeUnderThirteen = async () => {
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
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
      submittingRef.current = false;
      setBusy(false);
    }
  };

  const handleThirteenOrOlder = () => {
    if (submittingRef.current) {
      return;
    }
    if (needsFreshConsent) {
      void resumeUnderThirteen();
      return;
    }
    if (hasActiveConsent) {
      setShowThirteenPrompt(true);
      return;
    }
    submittingRef.current = true;
    setBusy(true);
    try {
      navigation.navigate('CreateAccount');
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  const handleAgeChange = (value: string) => {
    setAgeText(value);
    setTouched(true);
  };

  const handleFreshContinue = () => {
    setTouched(true);
    if (!isHydrated || busy || submittingRef.current) {
      return;
    }
    const next = parsePrivacyAgeInput(ageText);
    if (next.status !== 'integer') {
      return;
    }
    if (resolvePrivacyAgeRoute(next.age) === 'under13') {
      void resumeUnderThirteen();
      return;
    }
    handleThirteenOrOlder();
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
    <AuthScreenLayout canvas="brand" onBack={handleBack}>
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={styles.title}
          testID="auth-privacy-age-question"
        >
          {authCopy.privacyAge.title}
        </Text>
        <Text style={styles.supporting}>{authCopy.privacyAge.supporting}</Text>
      </View>

      {showThirteenPrompt ? (
        <View style={styles.prompt} testID="auth-privacy-age-active-prompt">
          <Text style={styles.supporting}>
            {parentalConsentCopy.privacyAge.activeConsentPrompt}
          </Text>
          <AuthPrimaryButton
            testID="auth-privacy-age-continue-approval"
            accentTone="auth"
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
            accentTone="auth"
            label={parentalConsentCopy.privacyAge.continueApproval}
            onPress={() => {
              void resumeUnderThirteen();
            }}
            disabled={busy || !isHydrated}
          />
          <AuthPrimaryButton
            testID="auth-privacy-age-thirteen-or-older"
            label={authCopy.privacyAge.thirteenOrOlder}
            variant="secondary"
            onPress={handleThirteenOrOlder}
            disabled={busy || !isHydrated}
          />
          {!needsFreshConsent ? (
            <AuthPrimaryButton
              testID="auth-privacy-age-start-over"
              label={parentalConsentCopy.privacyAge.startOver}
              variant="secondary"
              onPress={confirmStartOver}
              disabled={busy || !isHydrated}
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.actions}>
          <AuthTextField
            appearance="system"
            label={authCopy.privacyAge.fieldLabel}
            value={ageText}
            onChangeText={handleAgeChange}
            onBlur={() => {
              setTouched(true);
            }}
            onSubmitEditing={handleFreshContinue}
            error={inlineValidationError}
            keyboardType="number-pad"
            inputMode="numeric"
            autoCorrect={false}
            autoCapitalize="none"
            editable={!busy}
            testID="auth-privacy-age-input"
          />
          {ageRoute === 'under13' ? (
            <Text
              accessibilityLiveRegion="polite"
              style={styles.notice}
              testID="auth-privacy-age-under-thirteen-notice"
            >
              {authCopy.privacyAge.underThirteenVerificationNotice}
            </Text>
          ) : null}
          <AuthPrimaryButton
            testID="auth-privacy-age-continue"
            accentTone="auth"
            label={authCopy.privacyAge.continue}
            onPress={handleFreshContinue}
            disabled={busy || !isHydrated || !isValidAge}
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
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  notice: {
    ...typography.bodySecondary,
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
