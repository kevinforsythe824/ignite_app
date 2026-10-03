import type { SeasonSetupCatalogDocumentSnapshot } from '../data/mapSeasonSetupCatalogDocuments';
import type { MaterialSet } from '../domain/materialSet';
import type { OfficialRegionConfig } from '../domain/region';

/**
 * Setup configuration for one already-resolved Season.
 * Regions may include inactive official rows. Selectable rows are the active ones.
 * MaterialSets are identity and division metadata only. Cards and sections are absent.
 */
export interface SeasonSetupCatalog {
  readonly seasonId: string;
  readonly regions: readonly OfficialRegionConfig[];
  readonly materialSets: readonly MaterialSet[];
}

export type { SeasonSetupCatalogDocumentSnapshot } from '../data/mapSeasonSetupCatalogDocuments';

/**
 * Read port for seasons/{seasonId}/regions and seasons/{seasonId}/materialSets.
 * Does not read cards, sections, or participation.
 */
export interface SeasonSetupCatalogFirestoreSource {
  listRegionSnapshots(seasonId: string): Promise<readonly SeasonSetupCatalogDocumentSnapshot[]>;
  listMaterialSetSnapshots(
    seasonId: string,
  ): Promise<readonly SeasonSetupCatalogDocumentSnapshot[]>;
}

/** Read-only Season Setup catalog. No client writes. */
export interface SeasonSetupCatalogRepository {
  loadCatalog(seasonId: string): Promise<SeasonSetupCatalog>;
}
