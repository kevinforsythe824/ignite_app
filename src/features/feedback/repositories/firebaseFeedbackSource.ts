import { httpsCallable, type Functions } from 'firebase/functions';

import { getFirebaseFunctions } from '../../../services/firebase/firebaseFunctions';
import type { FeedbackSubmissionInput, SubmitFeedbackResult } from '../domain/feedbackSubmissionInput';
import { FeedbackError } from '../errors/feedbackError';
import { feedbackCopy } from '../copy/feedbackCopy';

/** Smallest Firebase Functions port for the submitFeedback callable. */
export interface FeedbackFirebaseSource {
  submit(input: FeedbackSubmissionInput): Promise<SubmitFeedbackResult>;
}

type HttpsCallableFactory = typeof httpsCallable;

function parseSubmitFeedbackResult(data: unknown): SubmitFeedbackResult {
  if (typeof data !== 'object' || data === null) {
    throw new FeedbackError('unexpected', feedbackCopy.errors.unexpected);
  }
  const submissionId = (data as { submissionId?: unknown }).submissionId;
  if (typeof submissionId !== 'string' || submissionId.trim().length === 0) {
    throw new FeedbackError('unexpected', feedbackCopy.errors.unexpected);
  }
  return { submissionId: submissionId.trim() };
}

export function createFirebaseFeedbackSource(
  getFunctionsInstance: typeof getFirebaseFunctions = getFirebaseFunctions,
  callHttps: HttpsCallableFactory = httpsCallable,
): FeedbackFirebaseSource {
  return {
    async submit(input) {
      const callable = callHttps(getFunctionsInstance() as Functions, 'submitFeedback');
      const result = await callable({
        category: input.category,
        title: input.title,
        message: input.message,
        appVersion: input.metadata.appVersion,
        platform: input.metadata.platform,
        osVersion: input.metadata.osVersion,
        deviceType: input.metadata.deviceType,
      });
      return parseSubmitFeedbackResult(result.data);
    },
  };
}
