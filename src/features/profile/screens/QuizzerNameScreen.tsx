import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import { useAuth } from '../../auth';
import { AuthPrimaryButton } from '../../auth/components/AuthPrimaryButton';
import { AuthScreenLayout } from '../../auth/components/AuthScreenLayout';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { AuthTextLink } from '../../auth/components/AuthTextLink';
import { QuizzerProfileError } from '../errors/quizzerProfileError';
import { quizzerProfileCopy } from '../copy/quizzerProfileCopy';
import { useQuizzerProfile } from '../state/QuizzerProfileProvider';

/**
 * Collects Quizzer first/last name and provisions the profile.
 * Does not navigate around RootNavigator — success updates provider to ready.
 */
export function QuizzerNameScreen(): React.JSX.Element {
  const { signOut } = useAuth();
  const { provisionProfile } = useQuizzerProfile();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstNameError, setFirstNameError] = useState<string | undefined>();
  const [lastNameError, setLastNameError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [signingOut, setSigningOut] = useState(false);

  const handleSubmit = async () => {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const nextFirstError =
      trimmedFirst.length === 0 ? quizzerProfileCopy.name.firstNameRequired : undefined;
    const nextLastError =
      trimmedLast.length === 0 ? quizzerProfileCopy.name.lastNameRequired : undefined;
    setFirstNameError(nextFirstError);
    setLastNameError(nextLastError);
    if (nextFirstError || nextLastError) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(undefined);
    try {
      await provisionProfile({ firstName: trimmedFirst, lastName: trimmedLast });
    } catch (error) {
      setErrorMessage(
        error instanceof QuizzerProfileError
          ? error.message
          : quizzerProfileCopy.loadError.supporting,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    if (signingOut || submitting) {
      return;
    }
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <AuthScreenLayout canvas="brand">
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title} testID="quizzer-name-title">
          {quizzerProfileCopy.name.title}
        </Text>
        <Text style={styles.supporting}>{quizzerProfileCopy.name.supporting}</Text>
      </View>
      <View style={styles.form}>
        <AuthTextField
          appearance="system"
          label={quizzerProfileCopy.name.firstName}
          value={firstName}
          onChangeText={(value) => {
            setFirstName(value);
            if (firstNameError) {
              setFirstNameError(
                value.trim().length === 0
                  ? quizzerProfileCopy.name.firstNameRequired
                  : undefined,
              );
            }
          }}
          error={firstNameError}
          autoCapitalize="words"
          autoCorrect={false}
          textContentType="givenName"
          returnKeyType="next"
          editable={!submitting && !signingOut}
          testID="quizzer-name-first"
        />
        <AuthTextField
          appearance="system"
          label={quizzerProfileCopy.name.lastName}
          value={lastName}
          onChangeText={(value) => {
            setLastName(value);
            if (lastNameError) {
              setLastNameError(
                value.trim().length === 0
                  ? quizzerProfileCopy.name.lastNameRequired
                  : undefined,
              );
            }
          }}
          error={lastNameError}
          autoCapitalize="words"
          autoCorrect={false}
          textContentType="familyName"
          returnKeyType="done"
          onSubmitEditing={() => {
            void handleSubmit();
          }}
          editable={!submitting && !signingOut}
          testID="quizzer-name-last"
        />
        {errorMessage ? (
          <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.formError}>
            {errorMessage}
          </Text>
        ) : null}
        <AuthPrimaryButton
          testID="quizzer-name-submit"
          accentTone="auth"
          label={quizzerProfileCopy.name.submit}
          loadingLabel={quizzerProfileCopy.name.submitting}
          onPress={() => {
            void handleSubmit();
          }}
          loading={submitting}
          disabled={submitting || signingOut}
        />
        <AuthTextLink
          testID="quizzer-name-sign-out"
          tone="authAccent"
          label={quizzerProfileCopy.actions.signOut}
          disabled={submitting || signingOut}
          onPress={() => {
            void handleSignOut();
          }}
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
