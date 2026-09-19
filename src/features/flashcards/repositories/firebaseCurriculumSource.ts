import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';

import { getFirebaseFirestore } from '../../../services/firebase';
import type { CurriculumFirestoreSource } from './firestoreCurriculumRepository';
import { FirestoreCurriculumRepository } from './firestoreCurriculumRepository';

const SEASONS_COLLECTION = 'seasons';
const CARDS_COLLECTION = 'cards';

/**
 * Production Firestore reads for curriculum.
 * Uses Phase 1 `getFirebaseFirestore()`; does not initialize Firebase itself.
 * Path remains seasons/{seasonId}/cards — nested materialSets are Phase 2.
 */
export function createFirebaseCurriculumSource(
  getDb: () => ReturnType<typeof getFirebaseFirestore> = getFirebaseFirestore,
): CurriculumFirestoreSource {
  return {
    async getSeason(seasonId) {
      const snapshot = await getDoc(doc(getDb(), SEASONS_COLLECTION, seasonId));
      return {
        exists: snapshot.exists(),
        data: snapshot.exists() ? snapshot.data() : undefined,
      };
    },

    async listCardsOrderedByNumber(seasonId) {
      const cardsQuery = query(
        collection(getDb(), SEASONS_COLLECTION, seasonId, CARDS_COLLECTION),
        orderBy('card_number'),
      );
      const snapshot = await getDocs(cardsQuery);
      return snapshot.docs.map((cardDoc) => ({
        cardId: cardDoc.id,
        data: cardDoc.data(),
      }));
    },
  };
}

export const firestoreCurriculumRepository = new FirestoreCurriculumRepository(
  createFirebaseCurriculumSource(),
);
