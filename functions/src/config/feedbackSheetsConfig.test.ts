import {
  DEFAULT_FEEDBACK_SHEETS_WORKSHEET_NAME,
  readFeedbackSheetsConfig,
} from './feedbackSheetsConfig';

describe('readFeedbackSheetsConfig', () => {
  it('returns null when spreadsheet ID is missing', () => {
    expect(readFeedbackSheetsConfig({})).toBeNull();
  });

  it('returns null when spreadsheet ID is blank', () => {
    expect(
      readFeedbackSheetsConfig({ FEEDBACK_SHEETS_SPREADSHEET_ID: '   ' }),
    ).toBeNull();
  });

  it('reads spreadsheet ID and defaults the worksheet name', () => {
    expect(
      readFeedbackSheetsConfig({
        FEEDBACK_SHEETS_SPREADSHEET_ID: ' spreadsheet-dev ',
      }),
    ).toEqual({
      spreadsheetId: 'spreadsheet-dev',
      worksheetName: DEFAULT_FEEDBACK_SHEETS_WORKSHEET_NAME,
    });
  });

  it('reads an explicit worksheet name', () => {
    expect(
      readFeedbackSheetsConfig({
        FEEDBACK_SHEETS_SPREADSHEET_ID: 'spreadsheet-dev',
        FEEDBACK_SHEETS_WORKSHEET_NAME: ' Review ',
      }),
    ).toEqual({
      spreadsheetId: 'spreadsheet-dev',
      worksheetName: 'Review',
    });
  });
});
