import type { SeasonSetupCatalogDocumentSnapshot } from '../data/mapSeasonSetupCatalogDocuments';
import type { MaterialSet } from '../domain/materialSet';

/**
 * Read port for seasons/{seasonId}/materialSets/{materialSetId}.
 * Does not read cards, sections, or regions.
 */
export interface SeasonMaterialSetCatalogFirestoreSource {
  listMaterialSetSnapshots(
    seasonId: string,
  ): Promise<readonly SeasonSetupCatalogDocumentSnapshot[]>;
}

/** Read-only MaterialSet identity catalog for one Season. No client writes. */
export interface SeasonMaterialSetCatalogRepository {
  listMaterialSets(seasonId: string): Promise<readonly MaterialSet[]>;
}
