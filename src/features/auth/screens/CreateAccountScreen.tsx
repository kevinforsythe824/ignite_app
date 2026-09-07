import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import { AuthPasswordField } from '../components/AuthPasswordField';
import { AuthPrimaryButton } from '../components/AuthPrimaryButton';
import { AuthScreenLayout } from '../components/AuthScreenLayout';
import { AuthTextField } from '../components/AuthTextField';
import { AuthTextLink } from '../components/AuthTextLink';
import { authCopy } from '../copy/authCopy';
import { useAuth } from '../hooks/useAuth';
import { useAuthOperation } from '../hooks/useAuthOperation';
import type { AccountCreationStackParamList, AuthStackParamList } from '../navigation/types';
import {
  hasFormErrors,
  validateCreateAccountForm,
  validateEmail,
  validatePasswordConfirmation,
  type CreateAccountFormErrors,
} from '../validation/authFormValidation';
import { parentalConsentCopy } from '../../parentalConsent/copy/parentalConsentCopy';
import { hasConsentCapability } from '../../parentalConsent/domain/consentClientSession';
import { useParentalConsent } from '../../parentalConsent/hooks/useParentalConsent';

export function CreateAccountScreen(): React.JSX.Element {
  const navigation =
    useNavigation<NativeStackNavigationProp<AccountCreationStackParamList, 'CreateAccount'>>();
  const { session: authSession, signUp } = useAuth();
  const {
    session: consentSession,
    hasActiveConsent,
    needsFreshConsent,
    refreshStatus,
    resolveResumeDestination,
    beginPostSignupClaim,
    completePostSignupClaim,
    cancelPostSignupClaim,
  } = useParentalConsent();
  const { submitting, errorMessage, run } = useAuthOperation();
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const [gateReady, setGateReady] = useState(false);
  const refreshStatusRef = useRef(refreshStatus);
  refreshStatusRef.current = refreshStatus;
  const resolveResumeDestinationRef = useRef(resolveResumeDestination);
  resolveResumeDestinationRef.current = resolveResumeDestination;
  /**
   * This mounted screen currently owns an in-flight fresh under-13 signup.
   * Set synchronously before beginPostSignupClaim so the focus gate does not
   * treat this screen's own awaitingClaim as prior-attempt Sign In recovery.
   * Must not persist across remounts.
   */
  const freshSignupInFlightRef = useRef(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<CreateAccountFormErrors>({});

  const redirectFromGate = useCallback(
    (destination: ReturnType<typeof resolveResumeDestination>) => {
      if (destination === 'pending') {
        navigation.replace('ConsentPending');
        return;
      }
      if (destination === 'recovery') {
        navigation.replace('ConsentRecovery');
        return;
      }
      if (destination === 'signInToClaim') {
        const parent = navigation.getParent<NativeStackNavigationProp<AuthStackParamList>>();
        parent?.replace('SignIn');
      }
    },
    [navigation],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const enforceGate = async () => {
        const ownedInFlightAwaitingClaim =
          freshSignupInFlightRef.current &&
          Boolean(consentSession.capability?.awaitingClaim);

        // needsFreshConsent / pendingClaimUid / awaitingClaim must never create
        // another Auth account (including ambiguous post-signup claim intent).
        // When already authenticated, RootNavigator owns the claim gate — do not
        // bounce a fresh under-13 signup to Sign In.
        // Local in-flight ownership: this screen just created awaitingClaim —
        // do not treat it as a prior/restarted attempt requiring Sign In.
        if (
          needsFreshConsent ||
          Boolean(consentSession.capability?.pendingClaimUid) ||
          (Boolean(consentSession.capability?.awaitingClaim) &&
            !freshSignupInFlightRef.current)
        ) {
          setGateReady(false);
          if (authSession.status !== 'authenticated') {
            redirectFromGate('signInToClaim');
          }
          return;
        }

        if (ownedInFlightAwaitingClaim) {
          return;
        }

        setGateReady(false);

        if (!hasActiveConsent) {
          // 13+ path — no consent session.
          if (!cancelled) {
            setGateReady(true);
          }
          return;
        }

        try {
          const snapshot = await refreshStatusRef.current();
          if (cancelled) {
            return;
          }
          if (!snapshot) {
            navigation.replace('ConsentRecovery');
            return;
          }
          const destination = resolveResumeDestinationRef.current(snapshot);
          if (destination !== 'createAccount') {
            redirectFromGate(destination);
            return;
          }
          setGateReady(true);
        } catch {
          if (!cancelled) {
            navigation.replace('ConsentRecovery');
          }
        }
      };

      void enforceGate();
      return () => {
        cancelled = true;
      };
    }, [
      authSession.status,
      consentSession.capability?.awaitingClaim,
      consentSession.capability?.pendingClaimUid,
      hasActiveConsent,
      needsFreshConsent,
      navigation,
      redirectFromGate,
    ]),
  );

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.getParent()?.goBack();
  };

  const handleSignIn = () => {
    const parent = navigation.getParent<NativeStackNavigationProp<AuthStackParamList>>();
    if (parent) {
      parent.replace('SignIn');
      return;
    }
    handleBack();
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (fieldErrors.email) {
      setFieldErrors((current) => ({
        ...current,
        email: validateEmail(value),
      }));
    }
  };

  const handleEmailBlur = () => {
    setFieldErrors((current) => ({
      ...current,
      email: validateEmail(email),
    }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setFieldErrors((current) => {
      if (!current.confirmPassword && confirmPassword.length === 0) {
        return current;
      }
      return {
        ...current,
        confirmPassword: validatePasswordConfirmation(value, confirmPassword),
      };
    });
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    setFieldErrors((current) => {
      if (value.length === 0 && !current.confirmPassword) {
        return current;
      }
      return {
        ...current,
        confirmPassword: validatePasswordConfirmation(password, value),
      };
    });
  };

  const handleConfirmPasswordBlur = () => {
    setFieldErrors((current) => ({
      ...current,
      confirmPassword: validatePasswordConfirmation(password, confirmPassword),
    }));
  };

  const handleSubmit = () => {
    const errors = validateCreateAccountForm({ email, password, confirmPassword });
    setFieldErrors(errors);
    if (hasFormErrors(errors)) {
      return;
    }

    const underThirteenPath = hasConsentCapability(consentSession.capability);

    void run(async () => {
      if (underThirteenPath) {
        freshSignupInFlightRef.current = true;
        try {
          await beginPostSignupClaim();
          try {
            const identity = await signUp({ email: email.trim(), password });
            await completePostSignupClaim(identity.uid);
          } catch (error) {
            await cancelPostSignupClaim();
            throw error;
          }
        } catch (error) {
          // Clear only after failure so a later gate pass can recover.
          // Success leaves ownership until this screen unmounts.
          freshSignupInFlightRef.current = false;
          throw error;
        }
        return;
      }
      await signUp({ email: email.trim(), password });
    });
  };

  if (!gateReady) {
    return (
      <AuthScreenLayout canvas="brand" onBack={handleBack}>
        <Text style={styles.supporting} testID="auth-create-account-gate">
          {parentalConsentCopy.createAccount.gateBlocked}
        </Text>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout canvas="brand" onBack={handleBack}>
      <View style={styles.header}>
        <Text style={styles.title}>{authCopy.createAccount.title}</Text>
        <Text style={styles.supporting}>{authCopy.createAccount.supporting}</Text>
      </View>
      <View style={styles.form}>
        <AuthTextField
          appearance="system"
          label={authCopy.fields.email}
          value={email}
          onChangeText={handleEmailChange}
          onBlur={handleEmailBlur}
          error={fieldErrors.email}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!submitting}
          testID="auth-create-account-email"
        />
        <AuthPasswordField
          appearance="system"
          ref={passwordRef}
          label={authCopy.fields.password}
          value={password}
          onChangeText={handlePasswordChange}
          error={fieldErrors.password}
          autoComplete="password-new"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
          editable={!submitting}
          testID="auth-create-account-password"
        />
        <AuthPasswordField
          appearance="system"
          ref={confirmRef}
          label={authCopy.fields.confirmPassword}
          value={confirmPassword}
          onChangeText={handleConfirmPasswordChange}
          onBlur={handleConfirmPasswordBlur}
          error={fieldErrors.confirmPassword}
          autoComplete="password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          editable={!submitting}
          testID="auth-create-account-confirm-password"
        />
        {errorMessage ? (
          <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.formError}>
            {errorMessage}
          </Text>
        ) : null}
        <AuthPrimaryButton
          testID="auth-create-account-submit"
          accentTone="auth"
          label={authCopy.createAccount.submit}
          loadingLabel={authCopy.createAccount.submitting}
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
        />
        <AuthTextLink
          testID="auth-create-account-sign-in"
          tone="authAccent"
          prompt={authCopy.createAccount.signInPrompt}
          label={authCopy.createAccount.signIn}
          disabled={submitting}
          onPress={handleSignIn}
        />
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.verseReference,
  },
  supporting: {
    ...typography.brandTagline,
  },
  form: {
    gap: spacing.md,
  },
  formError: {
    ...typography.hint,
    color: colors.practicingRed,
  },
});
