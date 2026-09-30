import { parseReadyParticipationRecord } from '../domain/readyParticipationRecord';
import type { QuizzerSeasonParticipation } from '../domain/quizzerSeasonParticipation';
import type { FirestoreQuizzerSeasonParticipationDocument } from './firestoreQuizzerSeasonParticipationDocument';

/** Thrown when persisted participation cannot become a valid ready record. */
export class InvalidParticipationDocumentError extends Error {
  readonly field: string;

  constructor(field: string, reason: string) {
    super(`Invalid participation document: ${field} ${reason}`);
    this.name = 'InvalidParticipationDocumentError';
    this.field = field;
  }
}

function isPathId(value: string): boolean {
  return value.length > 0 && value.trim() === value;
}

/**
 * Maps a participation document to domain.
 * Does not trim, infer ids from the path, or repair a partial record.
 * quizzerId and seasonId on the document must match the path exactly.
 */
export function mapFirestoreQuizzerSeasonParticipationToDomain(
  data: unknown,
  userId: string,
  seasonId: string,
): QuizzerSeasonParticipation {
  if (!isPathId(userId)) {
    throw new InvalidParticipationDocumentError('quizzerId', 'path id is invalid');
  }
  if (!isPathId(seasonId)) {
    throw new InvalidParticipationDocumentError('seasonId', 'path id is invalid');
  }

  const parsed = parseReadyParticipationRecord(data);
  if (!parsed.ok) {
    throw new InvalidParticipationDocumentError(parsed.field, 'is invalid');
  }
  if (parsed.participation.quizzerId !== userId) {
    throw new InvalidParticipationDocumentError('quizzerId', 'does not match the owner');
  }
  if (parsed.participation.seasonId !== seasonId) {
    throw new InvalidParticipationDocumentError('seasonId', 'does not match the season');
  }

  return parsed.participation;
}

/** Copies a ready record into the exact document that may be stored. */
export function buildReadyParticipationDocument(
  participation: QuizzerSeasonParticipation,
): FirestoreQuizzerSeasonParticipationDocument {
  const parsed = parseReadyParticipationRecord(participation);
  if (!parsed.ok) {
    throw new InvalidParticipationDocumentError(parsed.field, 'is invalid');
  }
  return parsed.participation;
}
