export type SeasonLifecycleErrorCode =
  | 'permission-denied'
  | 'unavailable'
  | 'invalid-season-catalog'
  | 'ambiguous-season'
  | 'invalid-participation'
  | 'invalid-material-set'
  | 'unexpected';

const MESSAGES: Record<SeasonLifecycleErrorCode, string> = {
  'permission-denied': "Season information isn't available right now.",
  unavailable:
    'Season information is temporarily unavailable. Check your connection and try again.',
  'invalid-season-catalog': "Season information isn't available right now.",
  'ambiguous-season': "Season information isn't available right now.",
  'invalid-participation': "Season information isn't available right now.",
  'invalid-material-set': "Season information isn't available right now.",
  unexpected: "Season information isn't available right now.",
};

/**
 * Application-facing current-Season failure.
 * The message is safe to show. It does not include document contents or Firebase codes.
 */
export class SeasonLifecycleError extends Error {
  readonly code: SeasonLifecycleErrorCode;

  constructor(code: SeasonLifecycleErrorCode) {
    super(MESSAGES[code]);
    this.name = 'SeasonLifecycleError';
    this.code = code;
  }
}
