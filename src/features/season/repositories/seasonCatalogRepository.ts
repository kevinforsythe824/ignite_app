import type { SeasonCatalogDocumentSnapshot } from '../data/mapSeasonCatalogDocuments';
import type { Season } from '../domain/season';

export type { SeasonCatalogDocumentSnapshot } from '../data/mapSeasonCatalogDocuments';

/**
 * Read port for seasons/{seasonId} root documents.
 * Does not read cards, sections, regions, participation, or tournaments.
 */
export interface SeasonCatalogFirestoreSource {
  listSeasonSnapshots(): Promise<readonly SeasonCatalogDocumentSnapshot[]>;
}

/** Read-only Season catalog. No client writes. */
export interface SeasonCatalogRepository {
  listSeasons(): Promise<readonly Season[]>;
}
