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

export function noticeCollectionSummary(): string {
  return (
    'If approved, the account may collect account and learning information needed to operate Ignite (such as name, email, and study progress). This message does not include a child’s full personal profile.'
  );
}

export function emailActionBlock(label: string, url: string): string {
  const safeLabel = escapeHtml(label);
  const safeUrl = escapeHtml(url);
  return `<p><a href="${safeUrl}">${safeLabel}</a></p>
    <p>${safeLabel}: ${safeUrl}</p>`;
}

export function subjectFor(
  environment: IgniteEnvironmentName,
  body: string,
): string {
  return `${emailSubjectPrefix(environment)}${body}`;
}

export { NOTICE_VERSION };
