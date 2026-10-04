import { collection, getDocs } from 'firebase/firestore';

import { getFirebaseFirestore } from '../../../services/firebase/firestore';
import type {
  SeasonCatalogDocumentSnapshot,
  SeasonCatalogFirestoreSource,
} from './seasonCatalogRepository';

const SEASONS_COLLECTION = 'seasons';

/**
 * Production read of Season root documents.
 * Uses the shared Firestore instance. Does not read subcollections or write.
 */
export function createFirebaseSeasonCatalogSource(
  getDb: () => ReturnType<typeof getFirebaseFirestore> = getFirebaseFirestore,
): SeasonCatalogFirestoreSource {
  return {
    async listSeasonSnapshots(): Promise<SeasonCatalogDocumentSnapshot[]> {
      const snapshot = await getDocs(collection(getDb(), SEASONS_COLLECTION));
      return snapshot.docs.map((document) => ({
        id: document.id,
        data: document.data(),
      }));
    },
  };
}
