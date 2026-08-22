import type { FirestoreQuizzerProfileDocument } from '../data/firestoreQuizzerProfileDocument';
import {
  mapFirestoreQuizzerProfileToDomain,
  mapQuizzerProfileToFirestoreDocument,
} from '../data/mapFirestoreToQuizzerProfile';
import { normalizeProvisionInput } from '../domain/normalizeProvisionInput';
import type { ProvisionQuizzerProfileInput } from '../domain/provisionQuizzerProfileInput';
import type { QuizzerProfile } from '../domain/quizzerProfile';
import { translateQuizzerProfileError } from '../errors/translateQuizzerProfileError';
import type { QuizzerProfileRepository } from './quizzerProfileRepository';

export interface QuizzerProfileDocumentSnapshot {
  exists: boolean;
  data: unknown;
}

/**
 * Smallest Firestore port for Quizzer profile reads and atomic create-if-missing.
 * Injected in tests so unit tests do not require a live Firestore.
 */
export interface QuizzerProfileFirestoreSource {
  getProfile(quizzerId: string): Promise<QuizzerProfileDocumentSnapshot>;
  /**
   * Atomically: if the profile doc is missing, create it with `document`;
   * if it exists, return the existing snapshot unchanged (do not overwrite).
   */
  createProfileIfMissing(
    quizzerId: string,
    document: FirestoreQuizzerProfileDocument,
  ): Promise<QuizzerProfileDocumentSnapshot>;
}

/** Firestore-backed QuizzerProfileRepository. */
export class FirestoreQuizzerProfileRepository implements QuizzerProfileRepository {
  constructor(private readonly source: QuizzerProfileFirestoreSource) {}

  async getProfile(quizzerId: string): Promise<QuizzerProfile | null> {
    try {
      const snapshot = await this.source.getProfile(quizzerId);
      if (!snapshot.exists) {
        return null;
      }
      return mapFirestoreQuizzerProfileToDomain(snapshot.data, quizzerId);
    } catch (error) {
      translateQuizzerProfileError(error, quizzerId);
    }
  }

  async provisionProfile(input: ProvisionQuizzerProfileInput): Promise<QuizzerProfile> {
    let normalized;
    try {
      normalized = normalizeProvisionInput(input);
    } catch (error) {
      translateQuizzerProfileError(error, input.quizzerId);
    }

    const document = mapQuizzerProfileToFirestoreDocument(normalized);

    try {
      const snapshot = await this.source.createProfileIfMissing(
        normalized.quizzerId,
        document,
      );
      return mapFirestoreQuizzerProfileToDomain(snapshot.data, normalized.quizzerId);
    } catch (error) {
      translateQuizzerProfileError(error, normalized.quizzerId);
    }
  }
}
