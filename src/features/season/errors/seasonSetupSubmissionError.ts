export type SeasonSetupSubmissionErrorCode =
  | 'unauthenticated'
  | 'invalid-request'
  | 'configuration-unavailable'
  | 'unavailable'
  | 'unexpected';

const MESSAGES: Record<SeasonSetupSubmissionErrorCode, string> = {
  unauthenticated: 'Sign in to finish season setup.',
  'invalid-request': "This season setup can't be saved. Review your choices and try again.",
  'configuration-unavailable': "Season setup isn't available right now.",
  unavailable: 'Season setup is temporarily unavailable. Check your connection and try again.',
  unexpected: "Season setup isn't available right now.",
};

/**
 * Application-facing participation submission failure.
 * The message is the only text the Review screen shows.
 */
export class SeasonSetupSubmissionError extends Error {
  readonly code: SeasonSetupSubmissionErrorCode;

  constructor(code: SeasonSetupSubmissionErrorCode) {
    super(MESSAGES[code]);
    this.name = 'SeasonSetupSubmissionError';
    this.code = code;
  }
}
