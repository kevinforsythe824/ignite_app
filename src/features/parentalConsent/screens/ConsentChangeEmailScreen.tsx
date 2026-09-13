import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthPrimaryButton } from '../../auth/components/AuthPrimaryButton';
import { AuthScreenLayout } from '../../auth/components/AuthScreenLayout';
import { AuthTextField } from '../../auth/components/AuthTextField';
import type { AccountCreationStackParamList } from '../../auth/navigation/types';
import { colors, spacing, typography } from '../../../shared/theme';
import { parentalConsentCopy } from '../copy/parentalConsentCopy';
import { ParentalConsentError } from '../errors/parentalConsentError';
import { useParentalConsent } from '../hooks/useParentalConsent';
import { validateParentEmail } from '../validation/parentEmailValidation';

export function ConsentChangeEmailScreen(): React.JSX.Element {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<AccountCreationStackParamList, 'ConsentChangeEmail'>
    >();
  const { updateParentEmail } = useParentalConsent();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    const validationError = validateParentEmail(email);
    setFieldError(validationError);
    if (validationError || submitting) {
      return;
    }
    setSubmitting(true);
    setFormError(undefined);
    try {
      await updateParentEmail(email.trim());
      navigation.replace('ConsentPending');
    } catch (error) {
      if (
        error instanceof ParentalConsentError &&
        (error.code === 'permission-denied' ||
          error.code === 'not-found' ||
          error.code === 'failed-precondition')
      ) {
        navigation.replace('ConsentRecovery');
        return;
      }
      setFormError(
        error instanceof ParentalConsentError
          ? error.message
          : parentalConsentCopy.errors.unexpected,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreenLayout canvas="brand" onBack={handleBack}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          {parentalConsentCopy.changeEmail.title}
        </Text>
        <Text style={styles.supporting}>{parentalConsentCopy.changeEmail.supporting}</Text>
      </View>
      <View style={styles.form}>
        <AuthTextField
          appearance="system"
          label={parentalConsentCopy.parentEmail.fieldLabel}
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (fieldError) {
              setFieldError(validateParentEmail(value));
            }
          }}
          onBlur={() => setFieldError(validateParentEmail(email))}
          error={fieldError}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          returnKeyType="done"
          onSubmitEditing={() => {
            void handleSubmit();
          }}
          editable={!submitting}
          testID="consent-change-email-input"
        />
        {formError ? (
          <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.formError}>
            {formError}
          </Text>
        ) : null}
        <AuthPrimaryButton
          testID="consent-change-email-submit"
          accentTone="auth"
          label={parentalConsentCopy.changeEmail.submit}
          loadingLabel={parentalConsentCopy.changeEmail.submitting}
          onPress={() => {
            void handleSubmit();
          }}
          loading={submitting}
          disabled={submitting}
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
    color: colors.danger,
  },
});
