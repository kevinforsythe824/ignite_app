import { isSeasonSetupOpaqueId } from '../application/seasonSetupOpaqueId';
import {
  mapSeasonSetupMaterialSetDocuments,
  mapSeasonSetupRegionDocuments,
} from '../data/mapSeasonSetupCatalogDocuments';
import { SeasonSetupCatalogError } from '../errors/seasonSetupCatalogError';
import { translateSeasonSetupCatalogError } from '../errors/translateSeasonSetupCatalogError';
import type {
  SeasonSetupCatalog,
  SeasonSetupCatalogFirestoreSource,
  SeasonSetupCatalogRepository,
} from './seasonSetupCatalogRepository';

/** Firestore-backed Season Setup catalog. Read-only. */
export class FirestoreSeasonSetupCatalogRepository implements SeasonSetupCatalogRepository {
  constructor(private readonly source: SeasonSetupCatalogFirestoreSource) {}

  async loadCatalog(seasonId: string): Promise<SeasonSetupCatalog> {
    if (!isSeasonSetupOpaqueId(seasonId)) {
      throw new SeasonSetupCatalogError('invalid-catalog');
    }

    try {
      const [regionSnapshots, materialSetSnapshots] = await Promise.all([
        this.source.listRegionSnapshots(seasonId),
        this.source.listMaterialSetSnapshots(seasonId),
      ]);
      return {
        seasonId,
        regions: mapSeasonSetupRegionDocuments(regionSnapshots),
        materialSets: mapSeasonSetupMaterialSetDocuments(materialSetSnapshots, seasonId),
      };
    } catch (error) {
      translateSeasonSetupCatalogError(error);
    }
  }
}
