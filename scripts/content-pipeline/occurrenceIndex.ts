/**
 * A provided occurrenceIndex the parser already rejected (for example `1.5` or `second`).
 * Undefined remains "intentionally omitted" and is not rejected here.
 * Later stages must not resolve these rows again or treat them as blank.
 */
export function isRejectedOccurrenceIndex(row: {
  occurrenceIndex?: number;
  occurrenceIndexMalformed?: boolean;
}): boolean {
  return row.occurrenceIndexMalformed === true || Number.isNaN(row.occurrenceIndex);
}
