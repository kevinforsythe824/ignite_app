/**
 * Environment-owned parental-consent email / Hosting configuration.
 * Never put provider API keys here — secrets stay in Secret Manager / functions/.env.
 */

import type { IgniteEnvironmentName } from './environment';
import { readIgniteEnvironment } from './environment';

export type EnvLike = Record<string, string | undefined>;

export function getConsentHostingBaseUrl(
  env: EnvLike = process.env,
  environment: IgniteEnvironmentName = readIgniteEnvironment(env),
): string {
  const fromEnv = env.CONSENT_HOSTING_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  if (environment === 'dev') {
    return 'https://wpf-bible-qizzing.web.app';
  }
  throw new Error(
    `CONSENT_HOSTING_BASE_URL is required for IGNITE_ENV=${environment}.`,
  );
}

export function getConsentEmailFrom(
  env: EnvLike = process.env,
  environment: IgniteEnvironmentName = readIgniteEnvironment(env),
): string {
  const fromEnv = env.CONSENT_EMAIL_FROM?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (environment === 'dev') {
    return 'Ignite DEV <onboarding@resend.dev>';
  }
  throw new Error(`CONSENT_EMAIL_FROM is required for IGNITE_ENV=${environment}.`);
}

export function getPrivacyPolicyUrl(
  env: EnvLike = process.env,
  environment: IgniteEnvironmentName = readIgniteEnvironment(env),
): string {
  const fromEnv = env.PRIVACY_POLICY_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return `${getConsentHostingBaseUrl(env, environment)}/privacy`;
}

export function emailSubjectPrefix(
  environment: IgniteEnvironmentName = readIgniteEnvironment(),
): string {
  if (environment === 'dev') {
    return '[Ignite DEV] ';
  }
  if (environment === 'staging') {
    return '[Ignite STAGING] ';
  }
  return '';
}

export function buildConsentActionUrls(params: {
  hostingBaseUrl: string;
  approvalToken?: string;
  confirmationToken?: string;
  revokeToken?: string;
}): {
  approve?: string;
  confirm?: string;
  revoke?: string;
} {
  const base = params.hostingBaseUrl.replace(/\/$/, '');
  const urls: { approve?: string; confirm?: string; revoke?: string } = {};
  if (params.approvalToken) {
    urls.approve = `${base}/parent-consent/start?c=${encodeURIComponent(params.approvalToken)}`;
  }
  if (params.confirmationToken) {
    urls.confirm = `${base}/parent-consent/confirm/start?c=${encodeURIComponent(params.confirmationToken)}`;
  }
  if (params.revokeToken) {
    urls.revoke = `${base}/parent-consent/revoke/start?c=${encodeURIComponent(params.revokeToken)}`;
  }
  return urls;
}

export function noticeIdempotencyKey(
  requestId: string,
  deliveryVersion: number,
): string {
  return `initial-notice/${requestId}/${deliveryVersion}`;
}

export function confirmationIdempotencyKey(
  requestId: string,
  deliveryVersion: number,
): string {
  return `confirmation/${requestId}/${deliveryVersion}`;
}
