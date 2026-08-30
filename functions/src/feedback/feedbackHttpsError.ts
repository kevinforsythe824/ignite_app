import { HttpsError } from 'firebase-functions/v2/https';

export type FeedbackErrorCode =
  | 'invalid_argument'
  | 'unauthenticated'
  | 'unexpected';

/** Functions-domain feedback failure. Do not reuse consent toHttpsError. */
export class FeedbackError extends Error {
  readonly code: FeedbackErrorCode;

  constructor(code: FeedbackErrorCode, message: string) {
    super(message);
    this.name = 'FeedbackError';
    this.code = code;
  }
}

export function toFeedbackHttpsError(error: unknown): HttpsError {
  if (error instanceof HttpsError) {
    return error;
  }
  if (error instanceof FeedbackError) {
    switch (error.code) {
      case 'invalid_argument':
        return new HttpsError('invalid-argument', error.message);
      case 'unauthenticated':
        return new HttpsError('unauthenticated', error.message);
      default:
        return new HttpsError('internal', 'Unable to submit feedback.');
    }
  }
  return new HttpsError('internal', 'Unable to submit feedback.');
}
