export type ParticipationRepositoryErrorCode =
  | 'invalid-participation-data'
  | 'permission-denied'
  | 'unavailable'
  | 'unexpected';

/** Application-facing participation read failure. Missing participation is not an error. */
export class ParticipationRepositoryError extends Error {
  readonly code: ParticipationRepositoryErrorCode;

  constructor(code: ParticipationRepositoryErrorCode, message: string) {
    super(message);
    this.name = 'ParticipationRepositoryError';
    this.code = code;
  }
}
