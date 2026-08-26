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

/** Secrets required on every parental-consent function in deployed DEV. */
export const consentFunctionSecrets = [
  parentEmailHmacSecret,
  resendApiKeySecret,
];
