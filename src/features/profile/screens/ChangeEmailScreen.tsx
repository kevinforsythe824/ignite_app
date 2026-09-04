import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import { useAuth } from '../../auth';
import { AuthPasswordField } from '../../auth/components/AuthPasswordField';
import { AuthPrimaryButton } from '../../auth/components/AuthPrimaryButton';
import { AuthScreenLayout } from '../../auth/components/AuthScreenLayout';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { useAuthOperation } from '../../auth/hooks/useAuthOperation';
import { validateEmail, validateRequiredPassword } from '../../auth/validation/authFormValidation';
import { quizzerProfileCopy } from '../copy/quizzerProfileCopy';
import type { ProfileStackParamList } from '../navigation/types';

type ChangeEmailNavigation = NativeStackNavigationProp<ProfileStackParamList, 'ChangeEmail'>;

/** Change account email via AuthRepository (verify-before-update). */
export function ChangeEmailScreen(): React.JSX.Element {
  const navigation = useNavigation<ChangeEmailNavigation>();
  const { changeEmail, refreshIdentity } = useAuth();
  const { submitting, errorMessage, run } = useAuthOperation();
  const passwordRef = useRef<TextInput>(null);

  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async () => {
    const nextEmailError = validateEmail(newEmail);
    const nextPasswordError = validateRequiredPassword(currentPassword);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) {
      return;
    }

    const ok = await run(() =>
      changeEmail({
        newEmail: newEmail.trim(),
        currentPassword,
      }),
    );
    if (ok) {
      setCurrentPassword('');
      setSucceeded(true);
    }
  };

  if (succeeded) {
    return (
      <AuthScreenLayout edges={['bottom']}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title} testID="change-email-success-title">
            {quizzerProfileCopy.changeEmail.successTitle}
          </Text>
          <Text style={styles.supporting}>{quizzerProfileCopy.changeEmail.successBody}</Text>
        </View>
        <AuthPrimaryButton
          label={quizzerProfileCopy.changeEmail.done}
          onPress={() => {
            void (async () => {
              try {
                await refreshIdentity();
              } catch {
                // Keep last known identity; verification may still be pending.
              }
              navigation.goBack();
            })();
          }}
          testID="change-email-done"
        />
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout keyboardAvoiding edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.supporting}>{quizzerProfileCopy.changeEmail.supporting}</Text>
      </View>
      <View style={styles.form}>
        <AuthTextField
          label={quizzerProfileCopy.changeEmail.newEmail}
          value={newEmail}
          onChangeText={(value) => {
            setNewEmail(value);
            if (emailError) {
              setEmailError(validateEmail(value));
            }
          }}
          onBlur={() => {
            setEmailError(validateEmail(newEmail));
          }}
          error={emailError}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          testID="change-email-new"
        />
        <AuthPasswordField
          ref={passwordRef}
          label={quizzerProfileCopy.changeEmail.currentPassword}
          value={currentPassword}
          onChangeText={(value) => {
            setCurrentPassword(value);
            setPasswordError(undefined);
          }}
          error={passwordError}
          autoComplete="password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={() => {
            void handleSubmit();
          }}
          testID="change-email-password"
        />
        {errorMessage ? (
          <Text
            style={styles.error}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            testID="change-email-error"
          >
            {errorMessage}
          </Text>
        ) : null}
        <AuthPrimaryButton
          label={
            submitting
              ? quizzerProfileCopy.changeEmail.submitting
              : quizzerProfileCopy.changeEmail.submit
          }
          onPress={() => {
            void handleSubmit();
          }}
          loading={submitting}
          loadingLabel={quizzerProfileCopy.changeEmail.submitting}
          testID="change-email-submit"
        />
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.navy,
  },
  supporting: {
    ...typography.valueBody,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.md,
  },
  error: {
    ...typography.hint,
    color: colors.accentRed,
  },
});
