import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
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

export function CreateAccountScreen(): React.JSX.Element {
  const navigation =
    useNavigation<NativeStackNavigationProp<AccountCreationStackParamList, 'CreateAccount'>>();
  const { signUp } = useAuth();
  const { submitting, errorMessage, run } = useAuthOperation();
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<CreateAccountFormErrors>({});

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

    void run(() => signUp({ email: email.trim(), password }));
  };

  return (
    <AuthScreenLayout onBack={handleBack}>
      <View style={styles.header}>
        <Text style={styles.title}>{authCopy.createAccount.title}</Text>
        <Text style={styles.supporting}>{authCopy.createAccount.supporting}</Text>
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
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!submitting}
          testID="auth-create-account-email"
        />
        <AuthPasswordField
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
          label={authCopy.createAccount.submit}
          loadingLabel={authCopy.createAccount.submitting}
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
        />
        <AuthTextLink
          testID="auth-create-account-sign-in"
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
