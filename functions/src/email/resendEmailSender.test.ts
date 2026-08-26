import { ResendEmailSender } from './resendEmailSender';
import type { ResendClientLike } from './resendEmailSender';

describe('ResendEmailSender', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.IGNITE_ENV = 'dev';
    process.env.CONSENT_EMAIL_FROM = 'Ignite DEV <onboarding@resend.dev>';
    process.env.PRIVACY_POLICY_URL = 'https://wpf-bible-qizzing.web.app/privacy';
    process.env.CONSENT_HOSTING_BASE_URL = 'https://wpf-bible-qizzing.web.app';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('sends notice with idempotency key and does not throw secrets in errors', async () => {
    const calls: unknown[] = [];
    const client: ResendClientLike = {
      emails: {
        async send(payload, options) {
          calls.push({ payload, options });
          return { data: { id: 'msg_1' }, error: null };
        },
      },
    };
    const sender = new ResendEmailSender('re_test_key', 'dev', () => client);
    await sender.sendParentalConsentNotice({
      requestId: 'req1',
      toEmail: 'parent@example.com',
      maskedParentEmail: 'p***@example.com',
      idempotencyKey: 'initial-notice/req1/1',
      actionUrls: {
        approve: 'https://wpf-bible-qizzing.web.app/parent-consent/start?c=a',
        revoke: 'https://wpf-bible-qizzing.web.app/parent-consent/revoke/start?c=r',
      },
      noticeVersion: '2026-08-2',
      expiresAt: new Date('2026-09-01T00:00:00.000Z'),
    });

    expect(calls).toHaveLength(1);
    const call = calls[0] as {
      payload: { subject: string; to: string[]; html: string; text: string };
      options: { idempotencyKey: string };
    };
    expect(call.options.idempotencyKey).toBe('initial-notice/req1/1');
    expect(call.payload.subject).toContain('[Ignite DEV]');
    expect(call.payload.html).toContain('Review and approve');
    expect(call.payload.html).toContain('/parent-consent/start?c=a');
    expect(call.payload.text).toMatch(/review and approve/i);
    expect(call.payload.text).toContain('/parent-consent/start?c=a');
    expect(JSON.stringify(calls)).not.toContain('re_test_key');
  });

  it('maps provider errors without leaking recipient email', async () => {
    const client: ResendClientLike = {
      emails: {
        async send() {
          return {
            data: null,
            error: { message: 'boom', name: 'application_error' },
          };
        },
      },
    };
    const sender = new ResendEmailSender('re_test_key', 'dev', () => client);
    await expect(
      sender.sendParentalConsentConfirmation({
        requestId: 'req1',
        toEmail: 'secret-parent@example.com',
        maskedParentEmail: 's***@example.com',
        idempotencyKey: 'confirmation/req1/1',
        actionUrls: {
          revoke: 'https://wpf-bible-qizzing.web.app/parent-consent/revoke/start?c=r',
        },
        noticeVersion: '2026-08-2',
        expiresAt: new Date('2026-09-01T00:00:00.000Z'),
      }),
    ).rejects.toMatchObject({
      message: expect.not.stringContaining('secret-parent@example.com'),
    });
  });
});
