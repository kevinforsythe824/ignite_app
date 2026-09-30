import { FirebaseNotConfiguredError } from '../../../services/firebase';
import { InvalidParticipationDocumentError } from '../data/mapFirestoreQuizzerSeasonParticipation';
import { ParticipationRepositoryError } from './participationRepositoryError';

const PERMISSION_MESSAGE = 'You do not have permission to access this participation.';
const UNAVAILABLE_MESSAGE =
  'Participation is temporarily unavailable. Check your connection and try again.';
const UNEXPECTED_MESSAGE = 'Unable to load participation.';
const INVALID_MESSAGE = 'Participation data is invalid.';

function firestoreErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  const code = (error as { code: unknown }).code;
  if (typeof code !== 'string') {
    return undefined;
  }
  return code.replace(/^firestore\//, '');
}

/** Translates infrastructure and mapping failures. Never returns. */
export function translateParticipationRepositoryError(error: unknown): never {
  if (error instanceof ParticipationRepositoryError) {
    throw error;
  }

  if (error instanceof InvalidParticipationDocumentError) {
    throw new ParticipationRepositoryError('invalid-participation-data', INVALID_MESSAGE);
  }

  if (error instanceof FirebaseNotConfiguredError) {
    throw new ParticipationRepositoryError('unexpected', UNEXPECTED_MESSAGE);
  }

  const code = firestoreErrorCode(error);
  if (code === 'permission-denied') {
    throw new ParticipationRepositoryError('permission-denied', PERMISSION_MESSAGE);
  }
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    throw new ParticipationRepositoryError('unavailable', UNAVAILABLE_MESSAGE);
  }

  throw new ParticipationRepositoryError('unexpected', UNEXPECTED_MESSAGE);
}
