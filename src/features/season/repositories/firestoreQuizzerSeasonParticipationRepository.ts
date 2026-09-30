import { mapFirestoreQuizzerSeasonParticipationToDomain } from '../data/mapFirestoreQuizzerSeasonParticipation';
import type { QuizzerSeasonParticipation } from '../domain/quizzerSeasonParticipation';
import { translateParticipationRepositoryError } from '../errors/translateParticipationRepositoryError';
import type { QuizzerSeasonParticipationRepository } from './quizzerSeasonParticipationRepository';

export interface ParticipationDocumentSnapshot {
  exists: boolean;
  data: unknown;
}

/**
 * Read port for users/{userId}/seasons/{seasonId}.
 * The repository passes the trusted user id. It does not enumerate users.
 */
export interface QuizzerSeasonParticipationFirestoreSource {
  getParticipation(userId: string, seasonId: string): Promise<ParticipationDocumentSnapshot>;
}

/** Firestore-backed read repository. No client create, update, or delete. */
export class FirestoreQuizzerSeasonParticipationRepository
  implements QuizzerSeasonParticipationRepository
{
  constructor(private readonly source: QuizzerSeasonParticipationFirestoreSource) {}

  async getParticipation(
    userId: string,
    seasonId: string,
  ): Promise<QuizzerSeasonParticipation | null> {
    try {
      const snapshot = await this.source.getParticipation(userId, seasonId);
      if (!snapshot.exists) {
        return null;
      }
      return mapFirestoreQuizzerSeasonParticipationToDomain(snapshot.data, userId, seasonId);
    } catch (error) {
      translateParticipationRepositoryError(error);
    }
  }
}
