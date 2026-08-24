import type { FirestoreQuizzerProfileDocument } from '../data/firestoreQuizzerProfileDocument';
import {
  mapFirestoreQuizzerProfileToDomain,
  mapQuizzerProfileToFirestoreDocument,
} from '../data/mapFirestoreToQuizzerProfile';
import { normalizeNameFields } from '../domain/normalizeNameFields';
import { normalizeProvisionInput } from '../domain/normalizeProvisionInput';
import type { ProvisionQuizzerProfileInput } from '../domain/provisionQuizzerProfileInput';
import type { UpdateQuizzerNameInput } from '../domain/updateQuizzerNameInput';
import type { QuizzerProfile } from '../domain/quizzerProfile';
import { QuizzerProfileError } from '../errors/quizzerProfileError';
import { translateQuizzerProfileError } from '../errors/translateQuizzerProfileError';
import type { QuizzerProfileRepository } from './quizzerProfileRepository';

export interface QuizzerProfileDocumentSnapshot {
  exists: boolean;
  data: unknown;
}

export interface QuizzerProfileNameFields {
  first_name: string;
  last_name: string;
}

/**
 * Smallest Firestore port for Quizzer profile reads, atomic create-if-missing,
 * and narrow name-field updates.
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
  /**
   * Updates only first_name and last_name on an existing profile document.
   * Must not write avatar_id or replace the whole document.
   */
  updateNameFields(
    quizzerId: string,
    fields: QuizzerProfileNameFields,
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

  async updateName(input: UpdateQuizzerNameInput): Promise<QuizzerProfile> {
    const quizzerId = typeof input.quizzerId === 'string' ? input.quizzerId.trim() : '';
    if (quizzerId.length === 0) {
      throw new QuizzerProfileError(
        'invalid-profile-data',
        'Quizzer id is required to update a profile.',
      );
    }

    let names;
    try {
      names = normalizeNameFields({
        firstName: input.firstName,
        lastName: input.lastName,
      });
    } catch (error) {
      translateQuizzerProfileError(error, quizzerId);
    }

    try {
      const snapshot = await this.source.updateNameFields(quizzerId, {
        first_name: names.firstName,
        last_name: names.lastName,
      });
      if (!snapshot.exists) {
        throw new QuizzerProfileError(
          'unexpected',
          'Unable to load or save profile.',
          quizzerId,
        );
      }
      return mapFirestoreQuizzerProfileToDomain(snapshot.data, quizzerId);
    } catch (error) {
      translateQuizzerProfileError(error, quizzerId);
    }
  }
}
