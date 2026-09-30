/**
 * Region identity for season participation (PRD §8.4).
 * Participation stores regionId only. Names and coverage live on OfficialRegionConfig.
 */
export type RegionId = string;

export interface RegionRef {
  regionId: RegionId;
  displayName?: string;
}

/** Official Region configuration. Ids are assigned; they are not derived from display names. */
export interface OfficialRegionConfig {
  readonly regionId: RegionId;
  readonly displayName: string;
  readonly coverageAreas: readonly string[];
  readonly displayOrder: number;
  readonly active: boolean;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim() === value;
}

export function isValidOfficialRegionConfig(value: unknown): value is OfficialRegionConfig {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const row = value as Record<string, unknown>;
  if (!isNonEmptyString(row.regionId) || !isNonEmptyString(row.displayName)) {
    return false;
  }
  if (!Array.isArray(row.coverageAreas) || row.coverageAreas.length === 0) {
    return false;
  }
  if (!row.coverageAreas.every((area) => isNonEmptyString(area))) {
    return false;
  }
  const displayOrder = row.displayOrder;
  if (typeof displayOrder !== 'number' || !Number.isInteger(displayOrder) || displayOrder < 1) {
    return false;
  }
  return typeof row.active === 'boolean';
}

/** Active, valid Regions ordered by displayOrder, then regionId. Does not mutate the input. */
export function listActiveRegionsByDisplayOrder(
  regions: readonly OfficialRegionConfig[],
): readonly OfficialRegionConfig[] {
  if (!Array.isArray(regions)) {
    return [];
  }

  const active = regions.filter(
    (region) => isValidOfficialRegionConfig(region) && region.active,
  );

  return [...active].sort((left, right) => {
    if (left.displayOrder !== right.displayOrder) {
      return left.displayOrder - right.displayOrder;
    }
    if (left.regionId < right.regionId) {
      return -1;
    }
    if (left.regionId > right.regionId) {
      return 1;
    }
    return 0;
  });
}

export function findActiveRegionById(
  regions: readonly OfficialRegionConfig[],
  regionId: RegionId,
): OfficialRegionConfig | undefined {
  if (!isNonEmptyString(regionId)) {
    return undefined;
  }
  return listActiveRegionsByDisplayOrder(regions).find((region) => region.regionId === regionId);
}
