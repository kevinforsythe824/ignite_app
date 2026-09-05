import { Timestamp } from 'firebase-admin/firestore';

import type { FeedbackSubmissionWrite } from './submitFeedback';
import {
  categorizeSheetsError,
  createFeedbackSheetsMirror,
  FEEDBACK_SHEET_COLUMN_ORDER,
  mapFeedbackSheetRow,
  type SafeSheetsMirrorLog,
} from './feedbackSheetsMirror';
import { createGoogleSheetsValuesAppend, quoteWorksheetRange } from './googleSheetsFeedbackAdapter';

function sampleDocument(
  overrides: Partial<FeedbackSubmissionWrite> = {},
): FeedbackSubmissionWrite {
  return {
    category: 'bug',
    title: 'Practice button',
    message: 'Practice button did not respond during synthetic DEV testing.',
    appVersion: '1.0.0',
    platform: 'ios',
    osVersion: '17.0',
    deviceType: 'mobile',
    createdAt: Timestamp.fromDate(new Date('2026-08-30T19:00:00.000Z')),
    environment: 'dev',
    ...overrides,
  };
}

describe('mapFeedbackSheetRow', () => {
  it('maps approved fields in deterministic A-to-I order', () => {
    expect(FEEDBACK_SHEET_COLUMN_ORDER).toEqual([
      'createdAt',
      'category',
      'title',
      'message',
      'appVersion',
      'platform',
      'osVersion',
      'deviceType',
      'environment',
    ]);
    expect(mapFeedbackSheetRow(sampleDocument())).toEqual([
      '2026-08-30T19:00:00.000Z',
      'bug',
      'Practice button',
      'Practice button did not respond during synthetic DEV testing.',
      '1.0.0',
      'ios',
      '17.0',
      'mobile',
      'dev',
    ]);
  });

  it('uses an empty title cell when title is null', () => {
    const row = mapFeedbackSheetRow(sampleDocument({ title: null }));
    expect(row[2]).toBe('');
    expect(row).not.toContain('null');
  });

  it('does not include prohibited account, profile, or consent fields', () => {
    const row = mapFeedbackSheetRow(sampleDocument());
    const joined = row.join('|');
    expect(joined).not.toMatch(/uid|userId|email|Ada|consent|token|parent/i);
    expect(row).toHaveLength(FEEDBACK_SHEET_COLUMN_ORDER.length);
  });
});

describe('createFeedbackSheetsMirror', () => {
  it('appends the mapped row when config is present', async () => {
    const appendRow = jest.fn().mockResolvedValue(undefined);
    const logs: SafeSheetsMirrorLog[] = [];
    const mirror = createFeedbackSheetsMirror({
      environment: 'dev',
      readConfig: () => ({
        spreadsheetId: 'spreadsheet-dev',
        worksheetName: 'Feedback',
      }),
      appendRow,
      log: (entry) => logs.push(entry),
    });

    await mirror.append(sampleDocument());

    expect(appendRow).toHaveBeenCalledTimes(1);
    expect(appendRow).toHaveBeenCalledWith({
      spreadsheetId: 'spreadsheet-dev',
      worksheetName: 'Feedback',
      values: mapFeedbackSheetRow(sampleDocument()),
    });
    expect(logs).toEqual([]);
  });

  it('skips append and logs missing_config when config is absent', async () => {
    const appendRow = jest.fn();
    const logs: SafeSheetsMirrorLog[] = [];
    const mirror = createFeedbackSheetsMirror({
      environment: 'dev',
      readConfig: () => null,
      appendRow,
      log: (entry) => logs.push(entry),
    });

    await expect(mirror.append(sampleDocument())).resolves.toBeUndefined();
    expect(appendRow).not.toHaveBeenCalled();
    expect(logs).toEqual([
      {
        operation: 'feedbackSheetsMirror.append',
        environment: 'dev',
        errorCategory: 'missing_config',
        configPresent: false,
      },
    ]);
  });

  it('swallows Sheets API failure and logs a safe category', async () => {
    const appendRow = jest.fn().mockRejectedValue({ code: 403 });
    const logs: SafeSheetsMirrorLog[] = [];
    const mirror = createFeedbackSheetsMirror({
      environment: 'dev',
      readConfig: () => ({
        spreadsheetId: 'spreadsheet-dev',
        worksheetName: 'Feedback',
      }),
      appendRow,
      log: (entry) => logs.push(entry),
    });

    await expect(mirror.append(sampleDocument())).resolves.toBeUndefined();
    expect(logs).toEqual([
      {
        operation: 'feedbackSheetsMirror.append',
        environment: 'dev',
        errorCategory: 'permission_denied',
        configPresent: true,
      },
    ]);
    expect(JSON.stringify(logs[0])).not.toMatch(/Practice button|uid|email/i);
  });
});

describe('categorizeSheetsError', () => {
  it('maps common Google API and network failures', () => {
    expect(categorizeSheetsError({ code: 401 })).toBe('auth_failure');
    expect(categorizeSheetsError({ code: 404 })).toBe('not_found');
    expect(categorizeSheetsError({ code: 400 })).toBe('invalid_request');
    expect(categorizeSheetsError({ code: 503 })).toBe('unavailable');
    expect(categorizeSheetsError({ code: 'ENOTFOUND' })).toBe('network_failure');
    expect(categorizeSheetsError(new Error('unknown'))).toBe('unexpected');
  });
});

describe('createGoogleSheetsValuesAppend', () => {
  it('appends one RAW row to the worksheet range', async () => {
    const append = jest.fn().mockResolvedValue(undefined);
    const appendRow = createGoogleSheetsValuesAppend(() => ({
      spreadsheets: { values: { append } },
    }));

    await appendRow({
      spreadsheetId: 'spreadsheet-dev',
      worksheetName: 'Feedback',
      values: ['a', 'b'],
    });

    expect(append).toHaveBeenCalledWith({
      spreadsheetId: 'spreadsheet-dev',
      range: 'Feedback!A:I',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [['a', 'b']] },
    });
  });

  it('quotes worksheet names that are not bare identifiers', () => {
    expect(quoteWorksheetRange('Feedback')).toBe('Feedback!A:I');
    expect(quoteWorksheetRange("Ops 'Review'")).toBe("'Ops ''Review'''!A:I");
  });
});
