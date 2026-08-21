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
import { IgniteBrandMark } from '../components/IgniteBrandMark';
import { authCopy } from '../copy/authCopy';
import { useAuth } from '../hooks/useAuth';
import { useAuthOperation } from '../hooks/useAuthOperation';
import { startAccountCreation } from '../navigation/startAccountCreation';
import type { AuthStackParamList } from '../navigation/types';
import {
  hasFormErrors,
  validateSignInForm,
  type SignInFormErrors,
} from '../validation/authFormValidation';

export function SignInScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'SignIn'>>();
  const { signIn } = useAuth();
  const { submitting, errorMessage, run } = useAuthOperation();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<SignInFormErrors>({});

  const handleSubmit = () => {
    const errors = validateSignInForm({ email, password });
    setFieldErrors(errors);
    if (hasFormErrors(errors)) {
      return;
    }

    void run(() => signIn({ email: email.trim(), password }));
  };

  return (
    <AuthScreenLayout onBack={() => navigation.goBack()}>
      <View style={styles.header}>
        <IgniteBrandMark size="header" />
        <Text style={styles.title}>{authCopy.signIn.title}</Text>
        <Text style={styles.supporting}>{authCopy.signIn.supporting}</Text>
      </View>
      <View style={styles.form}>
        <AuthTextField
          label={authCopy.fields.email}
          value={email}
          onChangeText={setEmail}
          error={fieldErrors.email}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!submitting}
          testID="auth-sign-in-email"
        />
        <AuthPasswordField
          ref={passwordRef}
          label={authCopy.fields.password}
          value={password}
          onChangeText={setPassword}
          error={fieldErrors.password}
          autoComplete="password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          editable={!submitting}
          testID="auth-sign-in-password"
        />
        {errorMessage ? (
          <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.formError}>
            {errorMessage}
          </Text>
        ) : null}
        <AuthTextLink
          testID="auth-sign-in-forgot-password"
          label={authCopy.signIn.forgotPassword}
          disabled={submitting}
          onPress={() => navigation.navigate('ForgotPassword')}
        />
        <AuthPrimaryButton
          testID="auth-sign-in-submit"
          label={authCopy.signIn.submit}
          loadingLabel={authCopy.signIn.submitting}
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
        />
        <AuthTextLink
          testID="auth-sign-in-create-account"
          prompt={authCopy.signIn.createAccountPrompt}
          label={authCopy.signIn.createAccount}
          disabled={submitting}
          onPress={() => startAccountCreation(navigation)}
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
