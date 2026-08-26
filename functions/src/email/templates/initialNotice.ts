import type { IgniteEnvironmentName } from '../../config/environment';
import {
  emailActionBlock,
  escapeHtml,
  formatExpiry,
  legalDisclaimer,
  noticeCollectionSummary,
  subjectFor,
} from './shared';

export interface InitialNoticeTemplateInput {
  environment: IgniteEnvironmentName;
  maskedParentEmail: string;
  approveUrl: string;
  revokeUrl: string;
  privacyPolicyUrl: string;
  expiresAt: Date;
  noticeVersion: string;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export function renderInitialNotice(
  input: InitialNoticeTemplateInput,
): RenderedEmail {
  const subject = subjectFor(
    input.environment,
    'Parent/guardian action required for an Ignite account',
  );
  const expiry = formatExpiry(input.expiresAt);
  const text = [
    'Ignite — parental consent notice',
    '',
    `Hello (${input.maskedParentEmail}),`,
    '',
    'Someone requested an Ignite account that requires a parent or guardian to review and approve before the account can continue.',
    '',
    'What this is about:',
    '- Ignite is a Bible quizzing learning app.',
    `- ${noticeCollectionSummary()}`,
    '',
    `Privacy policy: ${input.privacyPolicyUrl}`,
    `This request expires at: ${expiry}`,
    `Notice version: ${input.noticeVersion}`,
    '',
    `To review and approve (opens Ignite’s secure page): ${input.approveUrl}`,
    `To decline or revoke later: ${input.revokeUrl}`,
    '',
    'Opening the link alone does not approve. You must confirm with an explicit action on the page.',
    '',
    legalDisclaimer(),
    '',
    'If you did not expect this message, you can ignore it or use the revoke link.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Ignite parental consent</title></head>
<body>
  <div>
    <h1>Ignite parental consent notice</h1>
    <p>Hello (<strong>${escapeHtml(input.maskedParentEmail)}</strong>),</p>
    <p>Someone requested an Ignite account that requires a parent or guardian to review and approve before the account can continue.</p>
    <h2>What information may be collected</h2>
    <p>${escapeHtml(noticeCollectionSummary())}</p>
    <p><a href="${escapeHtml(input.privacyPolicyUrl)}">Privacy policy</a></p>
    <p>This request expires at ${escapeHtml(expiry)}. Notice version: ${escapeHtml(input.noticeVersion)}.</p>
    ${emailActionBlock('Review and approve', input.approveUrl)}
    ${emailActionBlock('Decline or revoke', input.revokeUrl)}
    <p>Opening a link alone does not approve. You must confirm with an explicit action on the page.</p>
    <p><small>${escapeHtml(legalDisclaimer())}</small></p>
  </div>
</body>
</html>`;

  return { subject, text, html };
}
