/** Spreadsheet header occupies row 1. */
export const WORKBOOK_HEADER_ROW_COUNT = 1;

/**
 * First data row when a tooling row was built in memory and has no parsed Excel row.
 * Parsed workbooks carry the real Excel row instead.
 */
export const FIRST_UNPARSED_DATA_ROW = WORKBOOK_HEADER_ROW_COUNT + 1;

export function toolingSourceRow(sourceRow: number | undefined, zeroBasedIndex: number): number {
  if (sourceRow !== undefined && Number.isInteger(sourceRow) && sourceRow >= 1) {
    return sourceRow;
  }
  return zeroBasedIndex + FIRST_UNPARSED_DATA_ROW;
}
