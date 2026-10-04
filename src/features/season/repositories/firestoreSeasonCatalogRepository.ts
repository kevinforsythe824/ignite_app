import { mapSeasonCatalogDocuments } from '../data/mapSeasonCatalogDocuments';
import type { Season } from '../domain/season';
import { translateSeasonReadError } from '../errors/translateSeasonLifecycleError';
import type {
  SeasonCatalogFirestoreSource,
  SeasonCatalogRepository,
} from './seasonCatalogRepository';

/** Firestore-backed Season root catalog. Read-only. */
export class FirestoreSeasonCatalogRepository implements SeasonCatalogRepository {
  constructor(private readonly source: SeasonCatalogFirestoreSource) {}

  async listSeasons(): Promise<readonly Season[]> {
    try {
      const snapshots = await this.source.listSeasonSnapshots();
      return mapSeasonCatalogDocuments(snapshots);
    } catch (error) {
      translateSeasonReadError(error, 'invalid-season-catalog');
    }
  }
}
