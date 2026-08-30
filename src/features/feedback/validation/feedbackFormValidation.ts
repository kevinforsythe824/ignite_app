import { feedbackCopy } from '../copy/feedbackCopy';

/** Named client limits — match functions/src/feedback/feedbackPolicy.ts. */
export const FEEDBACK_TITLE_MAX_LENGTH = 80;
export const FEEDBACK_MESSAGE_MAX_LENGTH = 2000;
export const FEEDBACK_MESSAGE_MIN_LENGTH = 1;

export interface FeedbackFormValues {
  title: string;
  message: string;
}

export interface FeedbackFormFieldErrors {
  title?: string;
  message?: string;
}

export interface ValidatedFeedbackForm {
  title: string | null;
  message: string;
}

export function validateFeedbackForm(values: FeedbackFormValues): {
  errors: FeedbackFormFieldErrors;
  parsed: ValidatedFeedbackForm | null;
} {
  const trimmedTitle = values.title.trim();
  const trimmedMessage = values.message.trim();
  const errors: FeedbackFormFieldErrors = {};

  if (trimmedTitle.length > FEEDBACK_TITLE_MAX_LENGTH) {
    errors.title = feedbackCopy.compose.titleTooLong;
  }

  if (trimmedMessage.length < FEEDBACK_MESSAGE_MIN_LENGTH) {
    errors.message = feedbackCopy.compose.messageRequired;
  } else if (trimmedMessage.length > FEEDBACK_MESSAGE_MAX_LENGTH) {
    errors.message = feedbackCopy.compose.messageTooLong;
  }

  if (errors.title || errors.message) {
    return { errors, parsed: null };
  }

  return {
    errors: {},
    parsed: {
      title: trimmedTitle.length === 0 ? null : trimmedTitle,
      message: trimmedMessage,
    },
  };
}
