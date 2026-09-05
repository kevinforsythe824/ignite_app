/**
 * Backend-only Google Sheets mirror config for Help & Feedback.
 * Never expose these values to the React Native client.
 */

export type EnvLike = Record<string, string | undefined>;

export const FEEDBACK_SHEETS_SPREADSHEET_ID_KEY = 'FEEDBACK_SHEETS_SPREADSHEET_ID';
export const FEEDBACK_SHEETS_WORKSHEET_NAME_KEY = 'FEEDBACK_SHEETS_WORKSHEET_NAME';

/** Default tab name when the worksheet param is unset. Not environment-specific. */
export const DEFAULT_FEEDBACK_SHEETS_WORKSHEET_NAME = 'Feedback';

export interface FeedbackSheetsConfig {
  spreadsheetId: string;
  worksheetName: string;
}

/**
 * Returns Sheets mirror config when a spreadsheet ID is present.
 * Missing or blank ID is valid: the mirror is skipped (Firestore stays authoritative).
 */
export function readFeedbackSheetsConfig(
  env: EnvLike = process.env,
): FeedbackSheetsConfig | null {
  const spreadsheetId = env[FEEDBACK_SHEETS_SPREADSHEET_ID_KEY]?.trim() ?? '';
  if (spreadsheetId.length === 0) {
    return null;
  }

  const worksheetName =
    env[FEEDBACK_SHEETS_WORKSHEET_NAME_KEY]?.trim() ||
    DEFAULT_FEEDBACK_SHEETS_WORKSHEET_NAME;

  return { spreadsheetId, worksheetName };
}
