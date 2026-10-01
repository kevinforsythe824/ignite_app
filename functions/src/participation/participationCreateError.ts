export type ParticipationFailureReason =
  | 'unauthenticated'
  | 'malformed-input'
  | 'no-current-season'
  | 'season-config-invalid'
  | 'season-ambiguous'
  | 'wrong-season'
  | 'eligibility-invalid'
  | 'invalid-division-choice'
  | 'invalid-study-track-material-set'
  | 'material-set-config-invalid'
  | 'region-config-invalid'
  | 'invalid-region'
  | 'existing-participation-invalid'
  | 'persistence-failure'
  | 'unknown-environment'
  | 'invalid-calendar-instant';

const CLIENT_MESSAGES: Record<ParticipationFailureReason, string> = {
  unauthenticated: 'Authentication is required.',
  'malformed-input': 'The participation request is invalid.',
  'no-current-season': 'No season is available for setup.',
  'season-config-invalid': 'Season configuration is unavailable.',
  'season-ambiguous': 'Season configuration is unavailable.',
  'wrong-season': 'The requested season is not available for setup.',
  'eligibility-invalid': 'Eligibility for this season could not be confirmed.',
  'invalid-division-choice': 'The division choice is not allowed.',
  'invalid-study-track-material-set': 'The study material selection is not allowed.',
  'material-set-config-invalid': 'Season configuration is unavailable.',
  'region-config-invalid': 'Region configuration is unavailable.',
  'invalid-region': 'The region selection is not allowed.',
  'existing-participation-invalid': 'Existing participation could not be used.',
  'persistence-failure': 'Participation could not be saved.',
  'unknown-environment': 'Season configuration is unavailable.',
  'invalid-calendar-instant': 'Season configuration is unavailable.',
};

/**
 * Safe failure for participation create.
 * `reason` is for tests and server logs. `clientMessage` is the only client text.
 */
export class ParticipationCreateError extends Error {
  readonly clientMessage: string;

  constructor(readonly reason: ParticipationFailureReason) {
    const clientMessage = CLIENT_MESSAGES[reason];
    super(clientMessage);
    this.name = 'ParticipationCreateError';
    this.clientMessage = clientMessage;
  }
}
