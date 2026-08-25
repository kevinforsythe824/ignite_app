import { NOTICE_VERSION } from '../../config/consentPolicy';
import { emailSubjectPrefix } from '../../config/emailConfig';
import type { IgniteEnvironmentName } from '../../config/environment';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatExpiry(expiresAt: Date): string {
  return expiresAt.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function legalDisclaimer(): string {
  return (
    'This message requests parent/guardian permission for an Ignite account. ' +
    'Ignite does not claim that this process certifies legal COPPA compliance.'
  );
}

export function subjectFor(
  environment: IgniteEnvironmentName,
  body: string,
): string {
  return `${emailSubjectPrefix(environment)}${body}`;
}

export { NOTICE_VERSION };
