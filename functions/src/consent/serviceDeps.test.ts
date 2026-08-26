import { ParentalConsentError } from '../domain/parentalConsent';
import { ConsoleEmailSender } from '../email/consoleEmailSender';
import { ResendEmailSender } from '../email/resendEmailSender';
import { TestEmailCapture } from '../email/testEmailCapture';
import { CompositeEmailSender } from '../email/testEmailCapture';
import { resolveConsentEmailSender } from './serviceDeps';

describe('resolveConsentEmailSender', () => {
  it('uses console sender in emulator/test context', () => {
    const sender = resolveConsentEmailSender({
      emulator: true,
      resendApiKey: undefined,
    });
    expect(sender).toBeInstanceOf(ConsoleEmailSender);
  });

  it('uses Resend on deployed runtime when the API key is present', () => {
    const sender = resolveConsentEmailSender({
      emulator: false,
      resendApiKey: 're_test_not_a_real_key',
    });
    expect(sender).toBeInstanceOf(ResendEmailSender);
  });

  it('fails closed on deployed runtime without RESEND_API_KEY', () => {
    expect(() =>
      resolveConsentEmailSender({
        emulator: false,
        resendApiKey: undefined,
      }),
    ).toThrow(ParentalConsentError);
  });

  it('prefers an explicit sender override', () => {
    const capture = new TestEmailCapture();
    const override = new CompositeEmailSender(new ConsoleEmailSender(), capture);
    const sender = resolveConsentEmailSender({
      emulator: false,
      resendApiKey: undefined,
      emailSender: override,
    });
    expect(sender).toBe(override);
  });
});
