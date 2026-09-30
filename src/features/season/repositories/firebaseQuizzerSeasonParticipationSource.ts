import { doc, getDoc } from 'firebase/firestore';

import { getFirebaseFirestore } from '../../../services/firebase';
import {
  PARTICIPATION_SEASONS_COLLECTION,
  PARTICIPATION_USERS_COLLECTION,
} from '../data/firestoreQuizzerSeasonParticipationDocument';
import type { QuizzerSeasonParticipationFirestoreSource } from './firestoreQuizzerSeasonParticipationRepository';

/**
 * Production read adapter. Writes stay on the Admin SDK callable.
 * Uses getFirebaseFirestore(); does not initialize Firebase itself.
 */
export function createFirebaseQuizzerSeasonParticipationSource(
  getDb: () => ReturnType<typeof getFirebaseFirestore> = getFirebaseFirestore,
): QuizzerSeasonParticipationFirestoreSource {
  return {
    async getParticipation(userId, seasonId) {
      const snapshot = await getDoc(
        doc(
          getDb(),
          PARTICIPATION_USERS_COLLECTION,
          userId,
          PARTICIPATION_SEASONS_COLLECTION,
          seasonId,
        ),
      );
      return {
        exists: snapshot.exists(),
        data: snapshot.exists() ? snapshot.data() : undefined,
      };
    },
  };
}
