export type FeedbackErrorCode =
  | 'invalid-argument'
  | 'unauthenticated'
  | 'unavailable'
  | 'network-unavailable'
  | 'unexpected';

/** Application-facing feedback failure. UI must not depend on Firebase codes. */
export class FeedbackError extends Error {
  readonly code: FeedbackErrorCode;

  constructor(code: FeedbackErrorCode, message: string) {
    super(message);
    this.name = 'FeedbackError';
    this.code = code;
  }
}
