import { HttpsError, type FunctionsErrorCode } from 'firebase-functions/v2/https';

import {
  ParticipationCreateError,
  type ParticipationFailureReason,
} from './participationCreateError';

const HTTPS_CODES: Record<ParticipationFailureReason, FunctionsErrorCode> = {
  unauthenticated: 'unauthenticated',
  'malformed-input': 'invalid-argument',
  'no-current-season': 'failed-precondition',
  'season-config-invalid': 'failed-precondition',
  'season-ambiguous': 'failed-precondition',
  'wrong-season': 'failed-precondition',
  'eligibility-invalid': 'invalid-argument',
  'invalid-division-choice': 'invalid-argument',
  'invalid-study-track-material-set': 'invalid-argument',
  'material-set-config-invalid': 'failed-precondition',
  'region-config-invalid': 'failed-precondition',
  'invalid-region': 'invalid-argument',
  'existing-participation-invalid': 'failed-precondition',
  'persistence-failure': 'internal',
  'unknown-environment': 'failed-precondition',
  'calendar-unconfigured': 'failed-precondition',
};

/** Maps participation failures to HttpsError. Unknown errors stay non-PII. */
export function toParticipationHttpsError(error: unknown): HttpsError {
  if (error instanceof HttpsError) {
    return error;
  }
  if (error instanceof ParticipationCreateError) {
    return new HttpsError(HTTPS_CODES[error.reason], error.clientMessage);
  }
  return new HttpsError('internal', 'Participation could not be saved.');
}
