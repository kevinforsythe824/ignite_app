import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import { useAuth } from '../../auth';
import { AuthPasswordField } from '../../auth/components/AuthPasswordField';
import { AuthPrimaryButton } from '../../auth/components/AuthPrimaryButton';
import { AuthScreenLayout } from '../../auth/components/AuthScreenLayout';
import { useAuthOperation } from '../../auth/hooks/useAuthOperation';
import {
  validatePasswordConfirmation,
  validateRequiredPassword,
} from '../../auth/validation/authFormValidation';
import { quizzerProfileCopy } from '../copy/quizzerProfileCopy';
import type { ProfileStackParamList } from '../navigation/types';

type ChangePasswordNavigation = NativeStackNavigationProp<
  ProfileStackParamList,
  'ChangePassword'
>;

/** Change account password via AuthRepository (internal reauth). */
export function ChangePasswordScreen(): React.JSX.Element {
  const navigation = useNavigation<ChangePasswordNavigation>();
  const { changePassword } = useAuth();
  const { submitting, errorMessage, run } = useAuthOperation();
  const newPasswordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentError, setCurrentError] = useState<string | undefined>();
  const [newError, setNewError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async () => {
    const nextCurrent = validateRequiredPassword(currentPassword);
    const nextNew = validateRequiredPassword(newPassword);
    const nextConfirm = validatePasswordConfirmation(newPassword, confirmPassword);
    setCurrentError(nextCurrent);
    setNewError(nextNew);
    setConfirmError(nextConfirm);
    if (nextCurrent || nextNew || nextConfirm) {
      return;
    }

    const ok = await run(() =>
      changePassword({
        currentPassword,
        newPassword,
      }),
    );
    if (ok) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSucceeded(true);
    }
  };

  if (succeeded) {
    return (
      <AuthScreenLayout canvas="system" edges={['bottom']}>
        <View style={styles.header}>
          <Text
            accessibilityRole="header"
            style={styles.title}
            testID="change-password-success-title"
          >
            {quizzerProfileCopy.changePassword.successTitle}
          </Text>
          <Text style={styles.supporting}>{quizzerProfileCopy.changePassword.successBody}</Text>
        </View>
        <AuthPrimaryButton
          accentTone="product"
          label={quizzerProfileCopy.changePassword.done}
          onPress={() => navigation.goBack()}
          testID="change-password-done"
        />
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout canvas="system" keyboardAvoiding edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.supporting} testID="change-password-supporting">
          {quizzerProfileCopy.changePassword.supporting}
        </Text>
      </View>
      <View style={styles.form}>
        <AuthPasswordField
          appearance="system"
          label={quizzerProfileCopy.changePassword.currentPassword}
          value={currentPassword}
          onChangeText={(value) => {
            setCurrentPassword(value);
            setCurrentError(undefined);
          }}
          error={currentError}
          autoComplete="password"
          textContentType="password"
          returnKeyType="next"
          onSubmitEditing={() => newPasswordRef.current?.focus()}
          testID="change-password-current"
        />
        <AuthPasswordField
          ref={newPasswordRef}
          appearance="system"
          label={quizzerProfileCopy.changePassword.newPassword}
          value={newPassword}
          onChangeText={(value) => {
            setNewPassword(value);
            setNewError(undefined);
            // Keep confirm match error in sync when new password changes.
            if (confirmPassword.length > 0 || confirmError) {
              setConfirmError(validatePasswordConfirmation(value, confirmPassword));
            }
          }}
          error={newError}
          autoComplete="password-new"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
          testID="change-password-new"
        />
        <AuthPasswordField
          ref={confirmRef}
          appearance="system"
          label={quizzerProfileCopy.changePassword.confirmPassword}
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            if (value.length === 0 && !confirmError) {
              return;
            }
            setConfirmError(validatePasswordConfirmation(newPassword, value));
          }}
          onBlur={() => {
            setConfirmError(validatePasswordConfirmation(newPassword, confirmPassword));
          }}
          error={confirmError}
          autoComplete="password-new"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={() => {
            void handleSubmit();
          }}
          testID="change-password-confirm"
        />
        {errorMessage ? (
          <Text
            style={styles.error}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            testID="change-password-error"
          >
            {errorMessage}
          </Text>
        ) : null}
        <AuthPrimaryButton
          accentTone="product"
          label={
            submitting
              ? quizzerProfileCopy.changePassword.submitting
              : quizzerProfileCopy.changePassword.submit
          }
          onPress={() => {
            void handleSubmit();
          }}
          loading={submitting}
          loadingLabel={quizzerProfileCopy.changePassword.submitting}
          testID="change-password-submit"
        />
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
    paddingTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.sectionTitle,
  },
  supporting: {
    ...typography.bodySecondary,
  },
  form: {
    gap: spacing.formFieldGap,
  },
  error: {
    ...typography.error,
  },
});
