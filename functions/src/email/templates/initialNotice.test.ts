import { renderInitialNotice } from './initialNotice';

describe('renderInitialNotice', () => {
  const approveUrl =
    'https://wpf-bible-qizzing.web.app/parent-consent/start?c=opaque-approval';
  const revokeUrl =
    'https://wpf-bible-qizzing.web.app/parent-consent/revoke/start?c=opaque-revoke';

  const rendered = renderInitialNotice({
    environment: 'dev',
    maskedParentEmail: 'k***@gmail.com',
    approveUrl,
    revokeUrl,
    privacyPolicyUrl: 'https://wpf-bible-qizzing.web.app/privacy',
    expiresAt: new Date('2026-09-02T00:00:00.000Z'),
    noticeVersion: '2026-08-2',
  });

  it('includes the review-and-approve CTA and URL in HTML and plaintext', () => {
    expect(rendered.html).toContain('Review and approve');
    expect(rendered.html).toContain('/parent-consent/start?c=opaque-approval');
    expect(rendered.html).toContain(`href="${approveUrl}"`);
    expect(rendered.text).toMatch(/review and approve/i);
    expect(rendered.text).toContain(approveUrl);
  });

  it('includes the revoke CTA and URL in HTML and plaintext', () => {
    expect(rendered.html).toContain('Decline or revoke');
    expect(rendered.html).toContain(revokeUrl);
    expect(rendered.text).toContain(revokeUrl);
  });

  it('avoids email-client-hostile tags around the CTAs', () => {
    expect(rendered.html).not.toContain('<time');
    expect(rendered.html).not.toContain('<main');
  });
});
