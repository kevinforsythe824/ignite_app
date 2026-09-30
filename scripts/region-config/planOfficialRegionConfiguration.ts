import type { OfficialRegionConfig } from '../../src/features/season/domain/region';
import { OFFICIAL_REGIONS } from '../../src/features/season/domain/officialRegions';
import { validateOfficialRegionCatalog } from '../../src/features/season/domain/validateOfficialRegionCatalog';

/**
 * Plans official Region documents for one season.
 * This is not the curriculum importer and it does not delete unknown regions.
 * Phase 3B does not execute this against a live Firebase project.
 */

export class RegionConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegionConfigurationError';
  }
}

export interface ExistingRegionDocument {
  regionId: string;
  data: unknown;
}

export type RegionWriteAction = 'create' | 'update' | 'unchanged';

export interface PlannedRegionWrite {
  action: RegionWriteAction;
  path: string;
  regionId: string;
  document: OfficialRegionConfig;
}

export interface OfficialRegionConfigurationPlan {
  seasonId: string;
  writes: readonly PlannedRegionWrite[];
  untouchedUnknownRegionIds: readonly string[];
}

export interface RegionDocumentWriter {
  set(path: string, document: OfficialRegionConfig): Promise<void>;
}

function isSafeSeasonId(seasonId: string): boolean {
  return seasonId.length > 0 && seasonId.trim() === seasonId && !seasonId.includes('/');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sameCoverage(left: unknown, right: readonly string[]): boolean {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((area, index) => area === right[index])
  );
}

function sameRegionDocument(data: unknown, desired: OfficialRegionConfig): boolean {
  if (!isPlainObject(data)) {
    return false;
  }
  const keys = Object.keys(data).sort();
  const expected = ['active', 'coverageAreas', 'displayName', 'displayOrder', 'regionId'];
  if (keys.length !== expected.length || expected.some((key, index) => keys[index] !== key)) {
    return false;
  }
  return (
    data.regionId === desired.regionId &&
    data.displayName === desired.displayName &&
    data.displayOrder === desired.displayOrder &&
    data.active === desired.active &&
    sameCoverage(data.coverageAreas, desired.coverageAreas)
  );
}

export function officialRegionDocumentPath(seasonId: string, regionId: string): string {
  return `seasons/${seasonId}/regions/${regionId}`;
}

export function planOfficialRegionConfiguration(input: {
  seasonId: string;
  existing?: readonly ExistingRegionDocument[];
  catalog?: unknown;
}): OfficialRegionConfigurationPlan {
  if (!isSafeSeasonId(input.seasonId)) {
    throw new RegionConfigurationError('seasonId is invalid.');
  }

  const catalog = validateOfficialRegionCatalog(input.catalog ?? OFFICIAL_REGIONS);
  if (catalog.status === 'invalid') {
    throw new RegionConfigurationError(`Region catalog is invalid (${catalog.reason}).`);
  }

  const existingById = new Map<string, ExistingRegionDocument>();
  for (const record of input.existing ?? []) {
    if (!existingById.has(record.regionId)) {
      existingById.set(record.regionId, record);
    }
  }

  const officialIds = new Set(catalog.regions.map((region) => region.regionId));
  const writes = [...catalog.regions]
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((region) => {
      const existing = existingById.get(region.regionId);
      let action: RegionWriteAction = 'create';
      if (existing && sameRegionDocument(existing.data, region)) {
        action = 'unchanged';
      } else if (existing) {
        action = 'update';
      }
      return {
        action,
        path: officialRegionDocumentPath(input.seasonId, region.regionId),
        regionId: region.regionId,
        document: region,
      };
    });

  const untouchedUnknownRegionIds = [...existingById.keys()]
    .filter((regionId) => !officialIds.has(regionId))
    .sort();

  return {
    seasonId: input.seasonId,
    writes,
    untouchedUnknownRegionIds,
  };
}

/** Applies create and update actions only. Unknown region documents are left in place. */
export async function applyOfficialRegionConfigurationPlan(
  plan: OfficialRegionConfigurationPlan,
  writer: RegionDocumentWriter,
): Promise<void> {
  for (const write of plan.writes) {
    if (write.action === 'unchanged') {
      continue;
    }
    await writer.set(write.path, write.document);
  }
}
