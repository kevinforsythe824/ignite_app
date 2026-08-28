export type ParentalConsentErrorCode =
  | 'invalid-argument'
  | 'unauthenticated'
  | 'permission-denied'
  | 'not-found'
  | 'already-exists'
  | 'failed-precondition'
  | 'resource-exhausted'
  | 'unavailable'
  | 'network-unavailable'
  | 'unexpected';

/** Application-facing parental consent failure. UI must not depend on Firebase codes. */
export class ParentalConsentError extends Error {
  readonly code: ParentalConsentErrorCode;

  constructor(code: ParentalConsentErrorCode, message: string) {
    super(message);
    this.name = 'ParentalConsentError';
    this.code = code;
  }
}
