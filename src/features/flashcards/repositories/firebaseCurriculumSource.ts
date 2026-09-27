import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';

import { getFirebaseFirestore } from '../../../services/firebase/firestore';
import type { CurriculumFirestoreSource } from './firestoreCurriculumRepository';
import { FirestoreCurriculumRepository } from './firestoreCurriculumRepository';

const SEASONS_COLLECTION = 'seasons';
const MATERIAL_SETS_COLLECTION = 'materialSets';
const SECTIONS_COLLECTION = 'sections';
const CARDS_COLLECTION = 'cards';
const CARD_NUMBER_FIELD = 'cardNumber';

/**
 * Production Firestore reads for one Season and one MaterialSet.
 * Uses Phase 1 `getFirebaseFirestore()`; does not initialize Firebase itself.
 * Paths are the canonical nested tree. Flat seasons/{seasonId}/cards is not read.
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

    async getMaterialSet(seasonId, materialSetId) {
      const snapshot = await getDoc(
        doc(
          getDb(),
          SEASONS_COLLECTION,
          seasonId,
          MATERIAL_SETS_COLLECTION,
          materialSetId,
        ),
      );
      return {
        exists: snapshot.exists(),
        data: snapshot.exists() ? snapshot.data() : undefined,
      };
    },

    async listSections(seasonId, materialSetId) {
      const snapshot = await getDocs(
        collection(
          getDb(),
          SEASONS_COLLECTION,
          seasonId,
          MATERIAL_SETS_COLLECTION,
          materialSetId,
          SECTIONS_COLLECTION,
        ),
      );
      return snapshot.docs.map((sectionDoc) => ({
        sectionId: sectionDoc.id,
        data: sectionDoc.data(),
      }));
    },

    async listCardsOrderedByNumber(seasonId, materialSetId) {
      const cardsQuery = query(
        collection(
          getDb(),
          SEASONS_COLLECTION,
          seasonId,
          MATERIAL_SETS_COLLECTION,
          materialSetId,
          CARDS_COLLECTION,
        ),
        orderBy(CARD_NUMBER_FIELD),
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
