import type {
  EmailSender,
  ParentalConsentConfirmationParams,
  ParentalConsentNoticeParams,
} from './emailSender';

/**
 * DEV / emulator email sender.
 * Logs only masked metadata — never raw tokens or full parent email.
 */
export class ConsoleEmailSender implements EmailSender {
  constructor(
    private readonly log: (message: string) => void = console.info,
  ) {}

  async sendParentalConsentNotice(
    params: ParentalConsentNoticeParams,
  ): Promise<void> {
    this.log(
      `[IgniteConsent] notice requestId=${params.requestId} to=${params.maskedParentEmail}`,
    );
  }

  async sendParentalConsentConfirmation(
    params: ParentalConsentConfirmationParams,
  ): Promise<void> {
    this.log(
      `[IgniteConsent] confirmation requestId=${params.requestId} to=${params.maskedParentEmail}`,
    );
  }
}
