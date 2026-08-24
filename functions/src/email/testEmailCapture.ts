import type {
  EmailSender,
  ParentalConsentConfirmationParams,
  ParentalConsentNoticeParams,
} from './emailSender';

export interface CapturedConsentEmail {
  type: 'notice' | 'confirmation';
  requestId: string;
  maskedParentEmail: string;
  approvalToken?: string;
  confirmationToken?: string;
  revokeToken?: string;
}

/**
 * Test-only capture of tokens/links.
 * Must not be used as a production logger.
 */
export class TestEmailCapture implements EmailSender {
  readonly messages: CapturedConsentEmail[] = [];

  async sendParentalConsentNotice(
    params: ParentalConsentNoticeParams,
  ): Promise<void> {
    this.messages.push({
      type: 'notice',
      requestId: params.requestId,
      maskedParentEmail: params.maskedParentEmail,
      approvalToken: params.approvalToken,
      revokeToken: params.revokeToken,
    });
  }

  async sendParentalConsentConfirmation(
    params: ParentalConsentConfirmationParams,
  ): Promise<void> {
    this.messages.push({
      type: 'confirmation',
      requestId: params.requestId,
      maskedParentEmail: params.maskedParentEmail,
      confirmationToken: params.confirmationToken,
      revokeToken: params.revokeToken,
    });
  }

  latestNotice(): CapturedConsentEmail | undefined {
    return [...this.messages].reverse().find((m) => m.type === 'notice');
  }

  latestConfirmation(): CapturedConsentEmail | undefined {
    return [...this.messages].reverse().find((m) => m.type === 'confirmation');
  }

  clear(): void {
    this.messages.length = 0;
  }
}

/** Composes console logging with test capture when provided. */
export class CompositeEmailSender implements EmailSender {
  constructor(
    private readonly primary: EmailSender,
    private readonly capture?: TestEmailCapture,
  ) {}

  async sendParentalConsentNotice(
    params: ParentalConsentNoticeParams,
  ): Promise<void> {
    await this.primary.sendParentalConsentNotice(params);
    if (this.capture) {
      await this.capture.sendParentalConsentNotice(params);
    }
  }

  async sendParentalConsentConfirmation(
    params: ParentalConsentConfirmationParams,
  ): Promise<void> {
    await this.primary.sendParentalConsentConfirmation(params);
    if (this.capture) {
      await this.capture.sendParentalConsentConfirmation(params);
    }
  }
}
