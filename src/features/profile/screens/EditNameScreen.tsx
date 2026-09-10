import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import { AuthPrimaryButton } from '../../auth/components/AuthPrimaryButton';
import { AuthScreenLayout } from '../../auth/components/AuthScreenLayout';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { QuizzerProfileError } from '../errors/quizzerProfileError';
import { quizzerProfileCopy } from '../copy/quizzerProfileCopy';
import type { ProfileStackParamList } from '../navigation/types';
import { useQuizzerProfile } from '../state/QuizzerProfileProvider';

type EditNameNavigation = NativeStackNavigationProp<ProfileStackParamList, 'EditName'>;

/** Edit first/last name for the current Quizzer profile. */
export function EditNameScreen(): React.JSX.Element {
  const navigation = useNavigation<EditNameNavigation>();
  const { session, updateName } = useQuizzerProfile();
  const lastNameRef = useRef<TextInput>(null);

  const readyProfile = session.status === 'ready' ? session.profile : null;
  const [firstName, setFirstName] = useState(readyProfile?.firstName ?? '');
  const [lastName, setLastName] = useState(readyProfile?.lastName ?? '');
  const [firstNameError, setFirstNameError] = useState<string | undefined>();
  const [lastNameError, setLastNameError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const handleSave = async () => {
    if (submitting) {
      return;
    }

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
      await updateName({ firstName: trimmedFirst, lastName: trimmedLast });
      navigation.goBack();
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

  return (
    <AuthScreenLayout canvas="system" keyboardAvoiding edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.supporting} testID="edit-name-supporting">
          {quizzerProfileCopy.editName.supporting}
        </Text>
      </View>
      <View style={styles.form}>
        <AuthTextField
          appearance="system"
          label={quizzerProfileCopy.name.firstName}
          value={firstName}
          onChangeText={(value) => {
            setFirstName(value);
            setFirstNameError(undefined);
          }}
          error={firstNameError}
          autoCapitalize="words"
          textContentType="givenName"
          returnKeyType="next"
          onSubmitEditing={() => lastNameRef.current?.focus()}
          testID="edit-name-first"
        />
        <AuthTextField
          ref={lastNameRef}
          appearance="system"
          label={quizzerProfileCopy.name.lastName}
          value={lastName}
          onChangeText={(value) => {
            setLastName(value);
            setLastNameError(undefined);
          }}
          error={lastNameError}
          autoCapitalize="words"
          textContentType="familyName"
          returnKeyType="done"
          onSubmitEditing={() => {
            void handleSave();
          }}
          testID="edit-name-last"
        />
        {errorMessage ? (
          <Text
            style={styles.error}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            testID="edit-name-error"
          >
            {errorMessage}
          </Text>
        ) : null}
        <AuthPrimaryButton
          accentTone="product"
          label={submitting ? quizzerProfileCopy.editName.saving : quizzerProfileCopy.editName.save}
          onPress={() => {
            void handleSave();
          }}
          loading={submitting}
          loadingLabel={quizzerProfileCopy.editName.saving}
          testID="edit-name-save"
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
