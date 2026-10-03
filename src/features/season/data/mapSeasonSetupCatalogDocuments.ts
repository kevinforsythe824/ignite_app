import { isSeasonSetupOpaqueId } from '../application/seasonSetupOpaqueId';
import { isDivisionId, type DivisionId } from '../domain/division';
import type { MaterialSet } from '../domain/materialSet';
import type { OfficialRegionConfig } from '../domain/region';
import { validateOfficialRegionCatalog } from '../domain/validateOfficialRegionCatalog';
import { SeasonSetupCatalogError } from '../errors/seasonSetupCatalogError';

/** One persisted document. `id` is the path id. `data` is untrusted. */
export interface SeasonSetupCatalogDocumentSnapshot {
  readonly id: string;
  readonly data: unknown;
}

/**
 * Content-pipeline MaterialSet documents store exactly these fields.
 * Ids are copied from the document. They are not built from division or year.
 */
const MATERIAL_SET_FIELDS = ['displayName', 'divisionId', 'materialSetId', 'seasonId'] as const;

function invalidCatalog(): never {
  throw new SeasonSetupCatalogError('invalid-catalog');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim() === value;
}

function assertSnapshotId(snapshot: SeasonSetupCatalogDocumentSnapshot): string {
  if (
    snapshot === null ||
    typeof snapshot !== 'object' ||
    !isSeasonSetupOpaqueId(snapshot.id)
  ) {
    invalidCatalog();
  }
  return snapshot.id;
}

/**
 * Persisted Region rows must match the official catalog as a whole.
 * A bad row fails the catalog. Official region constants are not substituted.
 */
export function mapSeasonSetupRegionDocuments(
  snapshots: readonly SeasonSetupCatalogDocumentSnapshot[],
): readonly OfficialRegionConfig[] {
  if (!Array.isArray(snapshots)) {
    invalidCatalog();
  }

  const records: unknown[] = [];
  const seenDocumentIds = new Set<string>();
  for (const snapshot of snapshots) {
    const documentId = assertSnapshotId(snapshot);
    if (seenDocumentIds.has(documentId)) {
      invalidCatalog();
    }
    seenDocumentIds.add(documentId);
    if (!isPlainObject(snapshot.data) || snapshot.data.regionId !== documentId) {
      invalidCatalog();
    }
    records.push(snapshot.data);
  }

  const catalog = validateOfficialRegionCatalog(records);
  if (catalog.status !== 'valid') {
    invalidCatalog();
  }
  return catalog.regions;
}

function mapMaterialSetDocument(
  snapshot: SeasonSetupCatalogDocumentSnapshot,
  seasonId: string,
): MaterialSet {
  const documentId = assertSnapshotId(snapshot);
  if (!isPlainObject(snapshot.data)) {
    invalidCatalog();
  }

  const data = snapshot.data;
  const keys = Object.keys(data);
  if (
    keys.length !== MATERIAL_SET_FIELDS.length ||
    !MATERIAL_SET_FIELDS.every((field) => Object.prototype.hasOwnProperty.call(data, field))
  ) {
    invalidCatalog();
  }
  if (data.seasonId !== seasonId || data.materialSetId !== documentId) {
    invalidCatalog();
  }
  if (!isDivisionId(data.divisionId) || !isNonEmptyString(data.displayName)) {
    invalidCatalog();
  }
  if (!isSeasonSetupOpaqueId(data.materialSetId) || !isSeasonSetupOpaqueId(data.seasonId)) {
    invalidCatalog();
  }

  const divisionId: DivisionId = data.divisionId;
  return {
    seasonId: data.seasonId,
    materialSetId: data.materialSetId,
    divisionId,
    displayName: data.displayName,
  };
}

/**
 * MaterialSets for one Season. Missing sets stay missing.
 * Duplicate ids or two sets for one division fail the catalog.
 */
export function mapSeasonSetupMaterialSetDocuments(
  snapshots: readonly SeasonSetupCatalogDocumentSnapshot[],
  seasonId: string,
): readonly MaterialSet[] {
  if (!Array.isArray(snapshots) || !isSeasonSetupOpaqueId(seasonId)) {
    invalidCatalog();
  }

  const materialSets: MaterialSet[] = [];
  const seenIds = new Set<string>();
  const seenDivisions = new Set<string>();
  for (const snapshot of snapshots) {
    const materialSet = mapMaterialSetDocument(snapshot, seasonId);
    if (seenIds.has(materialSet.materialSetId) || seenDivisions.has(materialSet.divisionId)) {
      invalidCatalog();
    }
    seenIds.add(materialSet.materialSetId);
    seenDivisions.add(materialSet.divisionId);
    materialSets.push(materialSet);
  }
  return materialSets;
}
