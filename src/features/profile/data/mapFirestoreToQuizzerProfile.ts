import type { QuizzerProfile } from '../domain/quizzerProfile';
import type { FirestoreQuizzerProfileDocument } from './firestoreQuizzerProfileDocument';

/** Thrown when Firestore profile data cannot become a valid QuizzerProfile. */
export class InvalidQuizzerProfileDocumentError extends Error {
  readonly quizzerId: string | undefined;
  readonly field: string;

  constructor(field: string, reason: string, quizzerId?: string) {
    const location =
      quizzerId !== undefined ? ` (quizzer "${quizzerId}")` : '';
    super(`Invalid quizzer profile document${location}: ${field} ${reason}`);
    this.name = 'InvalidQuizzerProfileDocumentError';
    this.field = field;
    this.quizzerId = quizzerId;
  }
}

function fail(field: string, reason: string, quizzerId?: string): never {
  throw new InvalidQuizzerProfileDocumentError(field, reason, quizzerId);
}

/**
 * Faithfully maps a persisted profile document to domain.
 * Does not trim or repair values — corrupt empty/whitespace names surface as errors.
 */
export function mapFirestoreQuizzerProfileToDomain(
  data: unknown,
  quizzerId: string,
): QuizzerProfile {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    fail('document', 'must be an object', quizzerId);
  }

  const doc = data as Partial<FirestoreQuizzerProfileDocument>;

  if (typeof doc.first_name !== 'string') {
    fail('first_name', 'must be a string', quizzerId);
  }
  if (doc.first_name.length === 0 || doc.first_name.trim().length === 0) {
    fail('first_name', 'must be a non-empty string', quizzerId);
  }

  if (typeof doc.last_name !== 'string') {
    fail('last_name', 'must be a string', quizzerId);
  }
  if (doc.last_name.length === 0 || doc.last_name.trim().length === 0) {
    fail('last_name', 'must be a non-empty string', quizzerId);
  }

  if (doc.avatar_id !== null && typeof doc.avatar_id !== 'string') {
    fail('avatar_id', 'must be a string or null', quizzerId);
  }

  return {
    quizzerId,
    firstName: doc.first_name,
    lastName: doc.last_name,
    avatarId: doc.avatar_id ?? null,
  };
}

/** Maps a normalized domain provision payload to the Firestore document shape. */
export function mapQuizzerProfileToFirestoreDocument(profile: {
  firstName: string;
  lastName: string;
  avatarId: string | null;
}): FirestoreQuizzerProfileDocument {
  return {
    first_name: profile.firstName,
    last_name: profile.lastName,
    avatar_id: profile.avatarId,
  };
}
