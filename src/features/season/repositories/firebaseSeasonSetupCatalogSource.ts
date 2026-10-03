import { collection, getDocs } from 'firebase/firestore';

import { getFirebaseFirestore } from '../../../services/firebase/firestore';
import type {
  SeasonSetupCatalogDocumentSnapshot,
  SeasonSetupCatalogFirestoreSource,
} from './seasonSetupCatalogRepository';

const SEASONS_COLLECTION = 'seasons';
const REGIONS_COLLECTION = 'regions';
const MATERIAL_SETS_COLLECTION = 'materialSets';

function snapshotsFromDocs(
  docs: ReadonlyArray<{ id: string; data: () => unknown }>,
): SeasonSetupCatalogDocumentSnapshot[] {
  return docs.map((document) => ({
    id: document.id,
    data: document.data(),
  }));
}

/**
 * Production reads for one Season's Region and MaterialSet documents.
 * Uses the shared Firestore instance. Does not read cards, sections, or users.
 */
export function createFirebaseSeasonSetupCatalogSource(
  getDb: () => ReturnType<typeof getFirebaseFirestore> = getFirebaseFirestore,
): SeasonSetupCatalogFirestoreSource {
  return {
    async listRegionSnapshots(seasonId) {
      const snapshot = await getDocs(
        collection(getDb(), SEASONS_COLLECTION, seasonId, REGIONS_COLLECTION),
      );
      return snapshotsFromDocs(snapshot.docs);
    },

    async listMaterialSetSnapshots(seasonId) {
      const snapshot = await getDocs(
        collection(getDb(), SEASONS_COLLECTION, seasonId, MATERIAL_SETS_COLLECTION),
      );
      return snapshotsFromDocs(snapshot.docs);
    },
  };
}
