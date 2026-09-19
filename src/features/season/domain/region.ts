/**
 * Opaque region identity for season participation (PRD §8.4).
 * Phase 1 does not invent official WPF Region names.
 * DEV may later supply synthetic config; participation stores regionId only.
 */
export type RegionId = string;

export interface RegionRef {
  regionId: RegionId;
  displayName?: string;
}
