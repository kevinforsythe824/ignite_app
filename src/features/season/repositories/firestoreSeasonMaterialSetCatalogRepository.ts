import { mapSeasonSetupMaterialSetDocuments } from '../data/mapSeasonSetupCatalogDocuments';
import type { MaterialSet } from '../domain/materialSet';
import { translateSeasonReadError } from '../errors/translateSeasonLifecycleError';
import type {
  SeasonMaterialSetCatalogFirestoreSource,
  SeasonMaterialSetCatalogRepository,
} from './seasonMaterialSetCatalogRepository';

/**
 * Firestore-backed MaterialSet catalog.
 * Mapping rules stay in mapSeasonSetupMaterialSetDocuments.
 */
export class FirestoreSeasonMaterialSetCatalogRepository
  implements SeasonMaterialSetCatalogRepository
{
  constructor(private readonly source: SeasonMaterialSetCatalogFirestoreSource) {}

  async listMaterialSets(seasonId: string): Promise<readonly MaterialSet[]> {
    try {
      const snapshots = await this.source.listMaterialSetSnapshots(seasonId);
      return mapSeasonSetupMaterialSetDocuments(snapshots, seasonId);
    } catch (error) {
      translateSeasonReadError(error, 'invalid-material-set');
    }
  }
}
