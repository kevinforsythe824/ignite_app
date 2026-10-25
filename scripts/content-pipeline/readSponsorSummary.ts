import ExcelJS from 'exceljs';
import { issue } from './errors';
import { interpretSponsorCell } from './sponsorCell';
import type { ValidationIssue } from './types';

export const SPONSOR_SUMMARY_SHEET = 'Summary';
export const SPONSOR_RULES_VERSION_LABEL = 'Rules version';

export type SponsorRulesVersionResult =
  | { readonly ok: true; readonly rulesVersion: string }
  | { readonly ok: false; readonly errors: readonly ValidationIssue[] };

function summaryIssue(
  workbookName: string,
  partial: { code: string; reason: string; row?: number; field?: string },
): ValidationIssue {
  return issue({
    code: partial.code,
    reason: partial.reason,
    workbook: workbookName,
    sheet: SPONSOR_SUMMARY_SHEET,
    row: partial.row,
    field: partial.field ?? SPONSOR_RULES_VERSION_LABEL,
  });
}

/**
 * Reads the rules-version string from a workbook already in memory.
 * The value is copied exactly. A path character fails closed so it cannot
 * enter sourceVersion or the fingerprint.
 */
export function readSponsorRulesVersion(
  workbook: ExcelJS.Workbook,
  workbookName: string,
): SponsorRulesVersionResult {
  const sheet = workbook.getWorksheet(SPONSOR_SUMMARY_SHEET);
  if (!sheet) {
    return {
      ok: false,
      errors: [
        summaryIssue(workbookName, {
          code: 'missing_sheet',
          reason: `Required sheet "${SPONSOR_SUMMARY_SHEET}" is missing.`,
        }),
      ],
    };
  }

  const matches: Array<{ row: number; value: ReturnType<typeof interpretSponsorCell> }> = [];
  sheet.eachRow((row, rowNumber) => {
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const label = interpretSponsorCell(cell.value);
      if (label.status !== 'text' || label.text !== SPONSOR_RULES_VERSION_LABEL) {
        return;
      }
      matches.push({
        row: rowNumber,
        value: interpretSponsorCell(row.getCell(colNumber + 1).value),
      });
    });
  });

  if (matches.length === 0) {
    return {
      ok: false,
      errors: [
        summaryIssue(workbookName, {
          code: 'missing_rules_version',
          reason: `Summary is missing "${SPONSOR_RULES_VERSION_LABEL}".`,
        }),
      ],
    };
  }
  if (matches.length > 1) {
    return {
      ok: false,
      errors: matches.map((match) =>
        summaryIssue(workbookName, {
          code: 'duplicate_rules_version',
          row: match.row,
          reason: `"${SPONSOR_RULES_VERSION_LABEL}" appears more than once.`,
        }),
      ),
    };
  }

  const match = matches[0];
  if (!match) {
    return {
      ok: false,
      errors: [
        summaryIssue(workbookName, {
          code: 'missing_rules_version',
          reason: `Summary is missing "${SPONSOR_RULES_VERSION_LABEL}".`,
        }),
      ],
    };
  }
  if (match.value.status !== 'text' || match.value.text.length === 0) {
    return {
      ok: false,
      errors: [
        summaryIssue(workbookName, {
          code: 'unexpected_cell_type',
          row: match.row,
          reason: `"${SPONSOR_RULES_VERSION_LABEL}" must be text.`,
        }),
      ],
    };
  }
  if (match.value.text.includes('/') || match.value.text.includes('\\')) {
    return {
      ok: false,
      errors: [
        summaryIssue(workbookName, {
          code: 'invalid_rules_version',
          row: match.row,
          reason: `"${SPONSOR_RULES_VERSION_LABEL}" must not contain a file path.`,
        }),
      ],
    };
  }

  return { ok: true, rulesVersion: match.value.text };
}
