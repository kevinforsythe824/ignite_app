import type { FeedbackRepository } from '../src/features/feedback/repositories/feedbackRepository';
import type {
  FeedbackSubmissionInput,
  SubmitFeedbackResult,
} from '../src/features/feedback/domain/feedbackSubmissionInput';
import { FeedbackError } from '../src/features/feedback/errors/feedbackError';

export interface FeedbackRepositoryFake extends FeedbackRepository {
  lastInput: FeedbackSubmissionInput | undefined;
  submitCallCount(): number;
  setSubmitError(error: FeedbackError | null): void;
  setSubmitDelay(delay: () => Promise<void>): void;
  setSubmitResult(result: SubmitFeedbackResult): void;
}

export function createFeedbackRepositoryFake(options?: {
  submitError?: FeedbackError;
  result?: SubmitFeedbackResult;
}): FeedbackRepositoryFake {
  let submitError: FeedbackError | null = options?.submitError ?? null;
  let submitDelay: (() => Promise<void>) | null = null;
  let result: SubmitFeedbackResult = options?.result ?? { submissionId: 'fb-test-1' };
  let calls = 0;
  let lastInput: FeedbackSubmissionInput | undefined;

  return {
    get lastInput() {
      return lastInput;
    },
    submitCallCount: () => calls,
    setSubmitError(error) {
      submitError = error;
    },
    setSubmitDelay(delay) {
      submitDelay = delay;
    },
    setSubmitResult(next) {
      result = next;
    },
    submit: jest.fn(async (input: FeedbackSubmissionInput) => {
      calls += 1;
      lastInput = input;
      if (submitDelay) {
        await submitDelay();
      }
      if (submitError) {
        throw submitError;
      }
      return { ...result };
    }),
  };
}
