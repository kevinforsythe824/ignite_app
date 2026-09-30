import type { ReadyQuizzerSeasonParticipation } from '../domain/readyParticipationRecord';

/**
 * Persistence shape of QuizzerSeasonParticipation at:
 *   users/{userId}/seasons/{seasonId}
 *
 * The document is the participation record. There is no participation/main child.
 * Field names match the domain record. Eligibility inputs are not fields.
 */
export type FirestoreQuizzerSeasonParticipationDocument = ReadyQuizzerSeasonParticipation;

export const PARTICIPATION_USERS_COLLECTION = 'users';
export const PARTICIPATION_SEASONS_COLLECTION = 'seasons';

export const PARTICIPATION_PATH_PATTERN = 'users/{uid}/seasons/{seasonId}' as const;

export function quizzerSeasonParticipationDocumentPath(
  userId: string,
  seasonId: string,
): string {
  return `users/${userId}/seasons/${seasonId}`;
}
