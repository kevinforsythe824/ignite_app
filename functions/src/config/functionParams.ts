/**
 * Deployed Functions params (Secret Manager + non-secret config).
 * Bound on each exported function so process.env is populated at runtime.
 */

import { defineSecret, defineString } from 'firebase-functions/params';

export const parentEmailHmacSecret = defineSecret('PARENT_EMAIL_HMAC_SECRET');
export const resendApiKeySecret = defineSecret('RESEND_API_KEY');

export const igniteEnvParam = defineString('IGNITE_ENV', {
  default: 'dev',
  description: 'Ignite environment name: dev, staging, or prod',
});

/** Backend-only. Empty default skips the Sheets mirror. */
export const feedbackSheetsSpreadsheetIdParam = defineString(
  'FEEDBACK_SHEETS_SPREADSHEET_ID',
  {
    default: '',
    description:
      'Google Sheets spreadsheet ID for the Help & Feedback review mirror',
  },
);

export const feedbackSheetsWorksheetNameParam = defineString(
  'FEEDBACK_SHEETS_WORKSHEET_NAME',
  {
    default: 'Feedback',
    description: 'Google Sheets worksheet/tab name for the feedback mirror',
  },
);

/** Secrets required on every parental-consent function in deployed DEV. */
export const consentFunctionSecrets = [
  parentEmailHmacSecret,
  resendApiKeySecret,
];
