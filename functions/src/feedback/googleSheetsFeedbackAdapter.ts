import { auth, sheets } from '@googleapis/sheets';

import type { FeedbackSheetsAppendPort } from './feedbackSheetsMirror';

const SPREADSHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

/**
 * Quote a worksheet title for A1 notation when it is not a bare identifier.
 */
export function quoteWorksheetRange(worksheetName: string): string {
  const trimmed = worksheetName.trim();
  if (/^[A-Za-z0-9_]+$/.test(trimmed)) {
    return `${trimmed}!A:I`;
  }
  const escaped = trimmed.replace(/'/g, "''");
  return `'${escaped}'!A:I`;
}

export interface SheetsValuesAppendClient {
  spreadsheets: {
    values: {
      append: (request: {
        spreadsheetId: string;
        range: string;
        valueInputOption: 'RAW';
        insertDataOption: 'INSERT_ROWS';
        requestBody: { values: string[][] };
      }) => Promise<unknown>;
    };
  };
}

/**
 * Official Sheets API append.
 * RAW: user-supplied title/message must not be parsed as formulas.
 */
export function createGoogleSheetsValuesAppend(
  getClient: () => SheetsValuesAppendClient = createDefaultSheetsClient,
): FeedbackSheetsAppendPort['appendRow'] {
  return async (params) => {
    const client = getClient();
    await client.spreadsheets.values.append({
      spreadsheetId: params.spreadsheetId,
      range: quoteWorksheetRange(params.worksheetName),
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [params.values],
      },
    });
  };
}

function createDefaultSheetsClient(): SheetsValuesAppendClient {
  const googleAuth = new auth.GoogleAuth({
    scopes: [SPREADSHEETS_SCOPE],
  });
  return sheets({
    version: 'v4',
    auth: googleAuth,
  }) as SheetsValuesAppendClient;
}
