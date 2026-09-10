import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import { AuthPrimaryButton } from '../../auth/components/AuthPrimaryButton';
import { AuthScreenLayout } from '../../auth/components/AuthScreenLayout';
import { AuthTextField } from '../../auth/components/AuthTextField';
import type { ProfileStackParamList } from '../../profile/navigation/types';
import { feedbackCopy } from '../copy/feedbackCopy';
import type { FeedbackCategory } from '../domain/feedbackCategory';
import { FeedbackError } from '../errors/feedbackError';
import { useFeedbackRepository } from '../hooks/useFeedbackRepository';
import { collectSafeClientMetadata } from '../utils/collectSafeClientMetadata';
import { validateFeedbackForm } from '../validation/feedbackFormValidation';

type ComposeNavigation = NativeStackNavigationProp<ProfileStackParamList, 'FeedbackCompose'>;
type ComposeRoute = RouteProp<ProfileStackParamList, 'FeedbackCompose'>;

const COMPOSE_TITLE: Record<FeedbackCategory, string> = {
  bug: feedbackCopy.compose.bugTitle,
  feature: feedbackCopy.compose.featureTitle,
  general: feedbackCopy.compose.generalTitle,
};

const MESSAGE_INPUT_MIN_HEIGHT = 120;

/** Compose and submit one feedback category. */
export function FeedbackComposeScreen(): React.JSX.Element {
  const navigation = useNavigation<ComposeNavigation>();
  const route = useRoute<ComposeRoute>();
  const repository = useFeedbackRepository();
  const category = route.params.category;

  const submittingRef = useRef(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [titleError, setTitleError] = useState<string | undefined>();
  const [messageError, setMessageError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async () => {
    if (submittingRef.current) {
      return;
    }

    const { errors, parsed } = validateFeedbackForm({ title, message });
    setTitleError(errors.title);
    setMessageError(errors.message);
    if (!parsed) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setErrorMessage(undefined);

    try {
      await repository.submit({
        category,
        title: parsed.title,
        message: parsed.message,
        metadata: collectSafeClientMetadata(),
      });
      setTitle('');
      setMessage('');
      setSucceeded(true);
    } catch (error) {
      setErrorMessage(
        error instanceof FeedbackError ? error.message : feedbackCopy.errors.unexpected,
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (succeeded) {
    return (
      <AuthScreenLayout canvas="system" edges={['bottom']}>
        <View style={styles.header}>
          <Text
            accessibilityRole="header"
            style={styles.title}
            testID="feedback-success-title"
            accessibilityLiveRegion="polite"
          >
            {feedbackCopy.success.title}
          </Text>
          <Text style={styles.supporting}>{feedbackCopy.success.body}</Text>
        </View>
        <AuthPrimaryButton
          accentTone="product"
          label={feedbackCopy.success.done}
          onPress={() => navigation.goBack()}
          testID="feedback-success-done"
        />
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout canvas="system" keyboardAvoiding edges={['bottom']}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title} testID="feedback-compose-title">
          {COMPOSE_TITLE[category]}
        </Text>
        <Text style={styles.privacy} testID="feedback-privacy-note">
          {feedbackCopy.compose.privacyNote}
        </Text>
      </View>
      <View style={styles.form}>
        <AuthTextField
          appearance="system"
          label={feedbackCopy.compose.titleLabel}
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            setTitleError(undefined);
          }}
          error={titleError}
          autoCapitalize="sentences"
          returnKeyType="next"
          testID="feedback-title"
        />
        <AuthTextField
          appearance="system"
          label={feedbackCopy.compose.messageLabel}
          value={message}
          onChangeText={(value) => {
            setMessage(value);
            setMessageError(undefined);
          }}
          error={messageError}
          autoCapitalize="sentences"
          multiline
          textAlignVertical="top"
          inputStyle={styles.messageInput}
          returnKeyType="default"
          testID="feedback-message"
        />
        {errorMessage ? (
          <Text
            style={styles.error}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            testID="feedback-error"
          >
            {errorMessage}
          </Text>
        ) : null}
        <AuthPrimaryButton
          accentTone="product"
          label={submitting ? feedbackCopy.compose.submitting : feedbackCopy.compose.submit}
          onPress={() => {
            void handleSubmit();
          }}
          loading={submitting}
          loadingLabel={feedbackCopy.compose.submitting}
          testID="feedback-submit"
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
  privacy: {
    ...typography.helper,
  },
  form: {
    gap: spacing.formFieldGap,
  },
  messageInput: {
    minHeight: MESSAGE_INPUT_MIN_HEIGHT,
    paddingTop: spacing.sm,
  },
  error: {
    ...typography.error,
  },
});
