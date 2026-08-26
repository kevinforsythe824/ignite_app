import type { IgniteEnvironmentName } from '../../config/environment';
import {
  emailActionBlock,
  escapeHtml,
  formatExpiry,
  legalDisclaimer,
  noticeCollectionSummary,
  subjectFor,
} from './shared';
import type { RenderedEmail } from './initialNotice';

export interface ConfirmationNoticeTemplateInput {
  environment: IgniteEnvironmentName;
  maskedParentEmail: string;
  revokeUrl: string;
  privacyPolicyUrl: string;
  expiresAt: Date;
  noticeVersion: string;
  /** Present only when two-step confirmation policy is enabled. */
  confirmUrl?: string;
}

export function renderConfirmationNotice(
  input: ConfirmationNoticeTemplateInput,
): RenderedEmail {
  const subject = subjectFor(
    input.environment,
    input.confirmUrl
      ? 'Please confirm your Ignite parental consent'
      : 'Your Ignite parental consent was recorded',
  );
  const expiry = formatExpiry(input.expiresAt);
  const actionLines = input.confirmUrl
    ? [
        'Ignite’s server policy currently requires a confirmation step before consent is marked approved.',
        '',
        `Confirm consent: ${input.confirmUrl}`,
        `Revoke instead: ${input.revokeUrl}`,
        '',
        'Opening the link alone does not confirm. You must confirm with an explicit action on the page.',
      ]
    : [
        'This message is a confirmation notice only. No further action is required to keep this consent in effect.',
        '',
        'You may revoke consent at any time using the secure revoke link below. Revocation uses an explicit action on Ignite’s page; opening the link alone does not revoke.',
        '',
        `Revoke consent: ${input.revokeUrl}`,
      ];
  const text = [
    input.confirmUrl
      ? 'Ignite — confirm parental consent'
      : 'Ignite — parental consent recorded',
    '',
    `Hello (${input.maskedParentEmail}),`,
    '',
    input.confirmUrl
      ? 'You previously indicated consent for an Ignite account request.'
      : 'Parental consent for an Ignite account request was recorded on Ignite’s servers.',
    '',
    'What this is about:',
    '- Ignite is a Bible quizzing learning app.',
    `- ${noticeCollectionSummary()}`,
    '',
    `Privacy policy: ${input.privacyPolicyUrl}`,
    `This request expires at: ${expiry}`,
    `Notice version: ${input.noticeVersion}`,
    '',
    ...actionLines,
    '',
    legalDisclaimer(),
  ].join('\n');

  const confirmHtml = input.confirmUrl
    ? `<p>You previously indicated consent for an Ignite account request. Ignite’s server policy currently requires a confirmation step before consent is marked approved.</p>
    ${emailActionBlock('Confirm consent', input.confirmUrl)}
    ${emailActionBlock('Revoke instead', input.revokeUrl)}
    <p>Opening a link alone does not confirm. You must confirm with an explicit action on the page.</p>`
    : `<p>Parental consent for an Ignite account request was recorded on Ignite’s servers.</p>
    <p>This message is a confirmation notice only. No further action is required to keep this consent in effect.</p>
    <p>You may revoke consent at any time. Revocation uses an explicit action on Ignite’s page; opening the link alone does not revoke.</p>
    ${emailActionBlock('Revoke consent', input.revokeUrl)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${input.confirmUrl ? 'Ignite confirm consent' : 'Ignite parental consent recorded'}</title></head>
<body>
  <div>
    <h1>${input.confirmUrl ? 'Confirm parental consent' : 'Parental consent recorded'}</h1>
    <p>Hello (<strong>${escapeHtml(input.maskedParentEmail)}</strong>),</p>
    ${confirmHtml}
    <h2>What information may be collected</h2>
    <p>${escapeHtml(noticeCollectionSummary())}</p>
    <p><a href="${escapeHtml(input.privacyPolicyUrl)}">Privacy policy</a></p>
    <p>This request expires at ${escapeHtml(expiry)}. Notice version: ${escapeHtml(input.noticeVersion)}.</p>
    <p><small>${escapeHtml(legalDisclaimer())}</small></p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}
