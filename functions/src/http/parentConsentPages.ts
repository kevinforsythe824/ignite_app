import { escapeHtml } from '../email/templates/shared';

export function layoutPage(params: {
  title: string;
  heading: string;
  bodyHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(params.title)}</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main class="consent-main">
    <p class="brand">Ignite</p>
    <h1>${escapeHtml(params.heading)}</h1>
    ${params.bodyHtml}
  </main>
</body>
</html>`;
}

export function noticeFormHtml(params: {
  csrf: string;
  maskedParentEmail: string;
  expiresAt: string;
  action: string;
  submitLabel: string;
  description: string;
}): string {
  return `
    <p>${escapeHtml(params.description)}</p>
    <p>Parent email on file: <strong>${escapeHtml(params.maskedParentEmail)}</strong></p>
    <p>Request expires at <time>${escapeHtml(params.expiresAt)}</time>.</p>
    <p class="disclaimer">Opening this page does not approve or change consent. An explicit action is required. Ignite does not claim COPPA certification via this page.</p>
    <form method="post" action="${escapeHtml(params.action)}">
      <input type="hidden" name="csrf" value="${escapeHtml(params.csrf)}" />
      <button type="submit">${escapeHtml(params.submitLabel)}</button>
    </form>`;
}

export function outcomeHtml(message: string): string {
  return `<p>${escapeHtml(message)}</p>`;
}
