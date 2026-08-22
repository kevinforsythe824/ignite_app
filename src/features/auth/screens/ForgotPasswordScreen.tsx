import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import { AuthPrimaryButton } from '../components/AuthPrimaryButton';
import { AuthScreenLayout } from '../components/AuthScreenLayout';
import { AuthTextField } from '../components/AuthTextField';
import { AuthTextLink } from '../components/AuthTextLink';
import { authCopy } from '../copy/authCopy';
import { useAuth } from '../hooks/useAuth';
import { useAuthOperation } from '../hooks/useAuthOperation';
import type { AuthStackParamList } from '../navigation/types';
import {
  hasFormErrors,
  validateEmail,
  validateForgotPasswordForm,
  type ForgotPasswordFormErrors,
} from '../validation/authFormValidation';

export function ForgotPasswordScreen(): React.JSX.Element {
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>>();
  const { sendPasswordResetEmail } = useAuth();
  const { submitting, errorMessage, run } = useAuthOperation();

  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ForgotPasswordFormErrors>({});
  const [succeeded, setSucceeded] = useState(false);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setSucceeded(false);
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

  const handleSubmit = () => {
    const errors = validateForgotPasswordForm({ email });
    setFieldErrors(errors);
    if (hasFormErrors(errors)) {
      return;
    }

    void run(async () => {
      await sendPasswordResetEmail(email.trim());
      setSucceeded(true);
    });
  };

  return (
    <AuthScreenLayout onBack={() => navigation.goBack()}>
      <View style={styles.header}>
        <Text style={styles.title}>{authCopy.forgotPassword.title}</Text>
        <Text style={styles.supporting}>{authCopy.forgotPassword.supporting}</Text>
      </View>
      <View style={styles.form}>
        <AuthTextField
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
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          editable={!submitting}
          testID="auth-forgot-password-email"
        />
        {errorMessage ? (
          <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.formError}>
            {errorMessage}
          </Text>
        ) : null}
        {succeeded ? (
          <Text accessibilityLiveRegion="polite" style={styles.success}>
            {authCopy.forgotPassword.success}
          </Text>
        ) : null}
        <AuthPrimaryButton
          testID="auth-forgot-password-submit"
          label={authCopy.forgotPassword.submit}
          loadingLabel={authCopy.forgotPassword.submitting}
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
        />
        <AuthTextLink
          testID="auth-forgot-password-back-to-sign-in"
          label={authCopy.forgotPassword.backToSignIn}
          disabled={submitting}
          onPress={() => navigation.goBack()}
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
  success: {
    ...typography.hint,
    color: colors.navy,
  },
});
