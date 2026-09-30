import type { QuizzerSeasonParticipation } from '../domain/quizzerSeasonParticipation';

/**
 * Read model for the signed-in Quizzer's season participation.
 * Create, update, and delete are server-authoritative and are not on this contract.
 */
export interface QuizzerSeasonParticipationRepository {
  /**
   * Returns the ready participation for this user and season.
   * Null means the document is absent (setup still required).
   * Malformed persisted data throws; it is not reported as absent.
   */
  getParticipation(
    userId: string,
    seasonId: string,
  ): Promise<QuizzerSeasonParticipation | null>;
}
