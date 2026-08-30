import type {
  FeedbackSubmissionInput,
  SubmitFeedbackResult,
} from '../domain/feedbackSubmissionInput';

/**
 * Application-facing feedback repository.
 * Callables only — never Firestore client writes.
 */
export interface FeedbackRepository {
  submit(input: FeedbackSubmissionInput): Promise<SubmitFeedbackResult>;
}
