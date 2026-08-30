import { translateFeedbackError } from '../errors/translateFeedbackError';
import type { FeedbackSubmissionInput, SubmitFeedbackResult } from '../domain/feedbackSubmissionInput';
import type { FeedbackRepository } from './feedbackRepository';
import {
  createFirebaseFeedbackSource,
  type FeedbackFirebaseSource,
} from './firebaseFeedbackSource';

/** Firebase-backed FeedbackRepository used by the application layer. */
export class FirebaseFeedbackRepository implements FeedbackRepository {
  constructor(private readonly source: FeedbackFirebaseSource) {}

  async submit(input: FeedbackSubmissionInput): Promise<SubmitFeedbackResult> {
    try {
      return await this.source.submit(input);
    } catch (error: unknown) {
      throw translateFeedbackError(error);
    }
  }
}

export const firebaseFeedbackRepository = new FirebaseFeedbackRepository(
  createFirebaseFeedbackSource(),
);
