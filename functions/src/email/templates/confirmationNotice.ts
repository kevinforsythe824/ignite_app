import type { IgniteEnvironmentName } from '../../config/environment';
import {
  escapeHtml,
  formatExpiry,
  legalDisclaimer,
  subjectFor,
} from './shared';
import type { RenderedEmail } from './initialNotice';

export interface ConfirmationNoticeTemplateInput {
  environment: IgniteEnvironmentName;
  maskedParentEmail: string;
  confirmUrl: string;
  revokeUrl: string;
  privacyPolicyUrl: string;
  expiresAt: Date;
  noticeVersion: string;
}

export function renderConfirmationNotice(
  input: ConfirmationNoticeTemplateInput,
): RenderedEmail {
  const subject = subjectFor(
    input.environment,
    'Please confirm your Ignite parental consent',
  );
  const expiry = formatExpiry(input.expiresAt);
  const text = [
    'Ignite — confirm parental consent',
    '',
    `Hello (${input.maskedParentEmail}),`,
    '',
    'You previously indicated consent for an Ignite account request. Ignite’s server policy requires a confirmation step before consent is marked approved.',
    '',
    `Privacy policy: ${input.privacyPolicyUrl}`,
    `This request expires at: ${expiry}`,
    `Notice version: ${input.noticeVersion}`,
    '',
    `Confirm consent: ${input.confirmUrl}`,
    `Revoke instead: ${input.revokeUrl}`,
    '',
    'Opening the link alone does not confirm. You must confirm with an explicit action on the page.',
    '',
    legalDisclaimer(),
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Ignite confirm consent</title></head>
<body>
  <main>
    <h1>Confirm parental consent</h1>
    <p>Hello (<strong>${escapeHtml(input.maskedParentEmail)}</strong>),</p>
    <p>You previously indicated consent for an Ignite account request. Ignite’s server policy requires a confirmation step before consent is marked approved.</p>
    <p><a href="${escapeHtml(input.privacyPolicyUrl)}">Privacy policy</a></p>
    <p>This request expires at <time>${escapeHtml(expiry)}</time>. Notice version: ${escapeHtml(input.noticeVersion)}.</p>
    <p><a href="${escapeHtml(input.confirmUrl)}">Confirm consent</a></p>
    <p><a href="${escapeHtml(input.revokeUrl)}">Revoke instead</a></p>
    <p>Opening a link alone does not confirm. You must confirm with an explicit action on the page.</p>
    <p><small>${escapeHtml(legalDisclaimer())}</small></p>
  </main>
</body>
</html>`;

  return { subject, text, html };
}
