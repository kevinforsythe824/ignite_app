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

export function ParentEmailScreen(): React.JSX.Element {
  const navigation =
    useNavigation<NativeStackNavigationProp<AccountCreationStackParamList, 'ParentEmail'>>();
  const { createRequest } = useParentalConsent();
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
    if (validationError) {
      return;
    }
    if (submitting) {
      return;
    }
    setSubmitting(true);
    setFormError(undefined);
    try {
      await createRequest(email.trim());
      navigation.replace('ConsentPending');
    } catch (error) {
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
    <AuthScreenLayout onBack={handleBack}>
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={styles.title}
          testID="consent-parent-email-title"
        >
          {parentalConsentCopy.parentEmail.title}
        </Text>
        <Text style={styles.supporting}>{parentalConsentCopy.parentEmail.supporting}</Text>
      </View>
      <View style={styles.form}>
        <AuthTextField
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
          testID="consent-parent-email-input"
        />
        {formError ? (
          <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.formError}>
            {formError}
          </Text>
        ) : null}
        <AuthPrimaryButton
          testID="consent-parent-email-submit"
          label={parentalConsentCopy.parentEmail.submit}
          loadingLabel={parentalConsentCopy.parentEmail.submitting}
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
    color: colors.practicingRed,
  },
});
