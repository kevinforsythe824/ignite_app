import { FirebaseNotConfiguredError } from '../../../services/firebase';
import { InvalidQuizzerProfileDocumentError } from '../data/mapFirestoreToQuizzerProfile';
import { QuizzerProfileError } from './quizzerProfileError';

const PERMISSION_MESSAGE = 'You do not have permission to access this profile.';
const UNAVAILABLE_MESSAGE =
  'Profile is temporarily unavailable. Check your connection and try again.';
const UNEXPECTED_MESSAGE = 'Unable to load or save profile.';
const INVALID_MESSAGE = 'Profile data is invalid.';

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

/** Translates infrastructure / mapping failures into QuizzerProfileError. Never returns. */
export function translateQuizzerProfileError(
  error: unknown,
  quizzerId?: string,
): never {
  if (error instanceof QuizzerProfileError) {
    throw error;
  }

  if (error instanceof InvalidQuizzerProfileDocumentError) {
    throw new QuizzerProfileError(
      'invalid-profile-data',
      INVALID_MESSAGE,
      error.quizzerId ?? quizzerId,
    );
  }

  if (error instanceof FirebaseNotConfiguredError) {
    throw new QuizzerProfileError('unexpected', UNEXPECTED_MESSAGE, quizzerId);
  }

  const code = firestoreErrorCode(error);
  if (code === 'permission-denied') {
    throw new QuizzerProfileError('permission-denied', PERMISSION_MESSAGE, quizzerId);
  }
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    throw new QuizzerProfileError('unavailable', UNAVAILABLE_MESSAGE, quizzerId);
  }

  throw new QuizzerProfileError('unexpected', UNEXPECTED_MESSAGE, quizzerId);
}
