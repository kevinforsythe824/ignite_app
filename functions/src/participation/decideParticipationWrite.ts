import type { FirestoreQuizzerSeasonParticipationDocument } from '../../../src/features/season/data/firestoreQuizzerSeasonParticipationDocument';
import {
  buildReadyParticipationDocument,
  InvalidParticipationDocumentError,
  mapFirestoreQuizzerSeasonParticipationToDomain,
} from '../../../src/features/season/data/mapFirestoreQuizzerSeasonParticipation';

export type ParticipationWriteDecision =
  | { action: 'create'; document: FirestoreQuizzerSeasonParticipationDocument }
  | { action: 'return-existing'; document: FirestoreQuizzerSeasonParticipationDocument }
  | { action: 'reject-malformed' };

/**
 * Create-only transaction decision.
 * A valid existing record is returned unchanged. A malformed record is not overwritten.
 */
export function decideParticipationWrite(
  exists: boolean,
  existingData: unknown,
  userId: string,
  seasonId: string,
  nextDocument: FirestoreQuizzerSeasonParticipationDocument,
): ParticipationWriteDecision {
  if (!exists) {
    const created = mapFirestoreQuizzerSeasonParticipationToDomain(
      nextDocument,
      userId,
      seasonId,
    );
    return { action: 'create', document: buildReadyParticipationDocument(created) };
  }

  try {
    const existing = mapFirestoreQuizzerSeasonParticipationToDomain(
      existingData,
      userId,
      seasonId,
    );
    return {
      action: 'return-existing',
      document: buildReadyParticipationDocument(existing),
    };
  } catch (error) {
    if (error instanceof InvalidParticipationDocumentError) {
      return { action: 'reject-malformed' };
    }
    throw error;
  }
}
