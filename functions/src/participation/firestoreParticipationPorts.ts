import { getFirestore } from 'firebase-admin/firestore';

import { quizzerSeasonParticipationDocumentPath } from '../../../src/features/season/data/firestoreQuizzerSeasonParticipationDocument';

import { decideParticipationWrite } from './decideParticipationWrite';
import { ParticipationCreateError } from './participationCreateError';
import type {
  ParticipationCreatePort,
  SeasonParticipationCatalogPort,
} from './createQuizzerSeasonParticipation';

function participationRef(userId: string, seasonId: string) {
  return getFirestore().doc(quizzerSeasonParticipationDocumentPath(userId, seasonId));
}

/** Admin SDK read/create-if-missing adapter. Clients do not use this path. */
export function createFirestoreParticipationCreatePort(): ParticipationCreatePort {
  return {
    async read(userId, seasonId) {
      const snapshot = await participationRef(userId, seasonId).get();
      if (!snapshot.exists) {
        return { status: 'missing' };
      }
      return { status: 'present', data: snapshot.data() };
    },

    async createIfMissing(userId, seasonId, document) {
      const ref = participationRef(userId, seasonId);
      try {
        return await getFirestore().runTransaction(async (transaction) => {
          const snapshot = await transaction.get(ref);
          const decision = decideParticipationWrite(
            snapshot.exists,
            snapshot.exists ? snapshot.data() : undefined,
            userId,
            seasonId,
            document,
          );
          if (decision.action === 'reject-malformed') {
            return { status: 'existing-malformed' };
          }
          if (decision.action === 'return-existing') {
            return { status: 'existing', document: decision.document };
          }
          transaction.set(ref, decision.document);
          return { status: 'created', document: decision.document };
        });
      } catch (error) {
        if (error instanceof ParticipationCreateError) {
          throw error;
        }
        throw new ParticipationCreateError('persistence-failure');
      }
    },
  };
}

/**
 * Trusted season, MaterialSet, and Region reads.
 * Document data is returned as stored. Ids are not copied in from the path.
 */
export function createFirestoreSeasonParticipationCatalog(): SeasonParticipationCatalogPort {
  const db = getFirestore();
  return {
    async listSeasons() {
      const snapshot = await db.collection('seasons').get();
      return snapshot.docs.map((document) => document.data());
    },

    async listMaterialSets(seasonId) {
      const snapshot = await db.collection(`seasons/${seasonId}/materialSets`).get();
      return snapshot.docs.map((document) => document.data());
    },

    async listRegions(seasonId) {
      const snapshot = await db.collection(`seasons/${seasonId}/regions`).get();
      return snapshot.docs.map((document) => document.data());
    },
  };
}
