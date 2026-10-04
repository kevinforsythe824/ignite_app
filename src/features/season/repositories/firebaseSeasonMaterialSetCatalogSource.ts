import { collection, getDocs } from 'firebase/firestore';

import { getFirebaseFirestore } from '../../../services/firebase/firestore';
import type { SeasonSetupCatalogDocumentSnapshot } from '../data/mapSeasonSetupCatalogDocuments';
import type { SeasonMaterialSetCatalogFirestoreSource } from './seasonMaterialSetCatalogRepository';

const SEASONS_COLLECTION = 'seasons';
const MATERIAL_SETS_COLLECTION = 'materialSets';

/**
 * Production read of one Season's MaterialSet documents.
 * Uses the shared Firestore instance. Does not read cards, sections, or regions.
 */
export function createFirebaseSeasonMaterialSetCatalogSource(
  getDb: () => ReturnType<typeof getFirebaseFirestore> = getFirebaseFirestore,
): SeasonMaterialSetCatalogFirestoreSource {
  return {
    async listMaterialSetSnapshots(
      seasonId: string,
    ): Promise<SeasonSetupCatalogDocumentSnapshot[]> {
      const snapshot = await getDocs(
        collection(getDb(), SEASONS_COLLECTION, seasonId, MATERIAL_SETS_COLLECTION),
      );
      return snapshot.docs.map((document) => ({
        id: document.id,
        data: document.data(),
      }));
    },
  };
}
