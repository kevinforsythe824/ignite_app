import { OFFICIAL_REGIONS } from './officialRegions';
import {
  isValidOfficialRegionConfig,
  type OfficialRegionConfig,
} from './region';

/**
 * Whole-catalog check for Region documents read from persistence or prepared
 * for writes. Compares records to OFFICIAL_REGIONS. Does not drop bad rows.
 * A valid inactive record for an expected id is inactive, not malformed.
 */

export type OfficialRegionCatalogInvalidReason =
  | 'malformed'
  | 'duplicateRegionId'
  | 'duplicateDisplayOrder'
  | 'unexpectedRegion'
  | 'missingRegion'
  | 'incorrectOrder';

export type OfficialRegionCatalogResult =
  | { status: 'valid'; regions: readonly OfficialRegionConfig[] }
  | { status: 'invalid'; reason: OfficialRegionCatalogInvalidReason };

function invalid(reason: OfficialRegionCatalogInvalidReason): OfficialRegionCatalogResult {
  return { status: 'invalid', reason };
}

function sameCoverage(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((area, index) => area === right[index]);
}

function copyRegion(region: OfficialRegionConfig): OfficialRegionConfig {
  return {
    regionId: region.regionId,
    displayName: region.displayName,
    coverageAreas: [...region.coverageAreas],
    displayOrder: region.displayOrder,
    active: region.active,
  };
}

export function validateOfficialRegionCatalog(records: unknown): OfficialRegionCatalogResult {
  if (!Array.isArray(records)) {
    return invalid('malformed');
  }

  const parsed: OfficialRegionConfig[] = [];
  for (const record of records) {
    if (!isValidOfficialRegionConfig(record)) {
      return invalid('malformed');
    }
    parsed.push(copyRegion(record));
  }

  const seenIds = new Set<string>();
  for (const region of parsed) {
    if (seenIds.has(region.regionId)) {
      return invalid('duplicateRegionId');
    }
    seenIds.add(region.regionId);
  }

  const seenOrders = new Set<number>();
  for (const region of parsed) {
    if (seenOrders.has(region.displayOrder)) {
      return invalid('duplicateDisplayOrder');
    }
    seenOrders.add(region.displayOrder);
  }

  const officialById = new Map(OFFICIAL_REGIONS.map((region) => [region.regionId, region]));

  for (const region of parsed) {
    if (!officialById.has(region.regionId)) {
      return invalid('unexpectedRegion');
    }
  }

  for (const official of OFFICIAL_REGIONS) {
    if (!seenIds.has(official.regionId)) {
      return invalid('missingRegion');
    }
  }

  for (const region of parsed) {
    const official = officialById.get(region.regionId);
    if (!official) {
      return invalid('unexpectedRegion');
    }
    if (region.displayOrder !== official.displayOrder) {
      return invalid('incorrectOrder');
    }
    if (
      region.displayName !== official.displayName ||
      !sameCoverage(region.coverageAreas, official.coverageAreas)
    ) {
      return invalid('malformed');
    }
  }

  return { status: 'valid', regions: parsed };
}
