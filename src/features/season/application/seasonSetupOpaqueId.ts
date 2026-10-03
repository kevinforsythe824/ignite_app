/**
 * Ids the Season Setup wizard may hold temporarily.
 * Matches the callable's safe-id shape: non-empty, untrimmed-equal, no slash.
 * This does not look up Regions or MaterialSets.
 */
export function isSeasonSetupOpaqueId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.trim() === value &&
    !value.includes('/')
  );
}
