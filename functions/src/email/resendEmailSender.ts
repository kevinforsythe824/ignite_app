import { Resend } from 'resend';

import {
  getConsentEmailFrom,
  getPrivacyPolicyUrl,
} from '../config/emailConfig';
import type { IgniteEnvironmentName } from '../config/environment';
import { readIgniteEnvironment } from '../config/environment';
import { ParentalConsentError } from '../domain/parentalConsent';
import type {
  EmailSender,
  ParentalConsentConfirmationParams,
  ParentalConsentNoticeParams,
} from './emailSender';
import { renderConfirmationNotice } from './templates/confirmationNotice';
import { renderInitialNotice } from './templates/initialNotice';

export type ResendClientLike = {
  emails: {
    send: (
      payload: {
        from: string;
        to: string[];
        subject: string;
        html: string;
        text: string;
        headers?: Record<string, string>;
      },
      options?: { idempotencyKey?: string },
    ) => Promise<{ data: { id: string } | null; error: { message: string; name?: string } | null }>;
  };
};

/**
 * Production-quality transactional adapter for DEV (and later envs).
 * Never logs toEmail, raw tokens, or API keys.
 */
export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly environment: IgniteEnvironmentName = readIgniteEnvironment(),
    private readonly clientFactory: (key: string) => ResendClientLike = (key) =>
      new Resend(key) as unknown as ResendClientLike,
  ) {}

  async sendParentalConsentNotice(
    params: ParentalConsentNoticeParams,
  ): Promise<void> {
    if (!params.actionUrls.approve || !params.actionUrls.revoke) {
      throw new ParentalConsentError(
        'internal',
        'Consent notice requires approve and revoke URLs.',
      );
    }
    const rendered = renderInitialNotice({
      environment: this.environment,
      maskedParentEmail: params.maskedParentEmail,
      approveUrl: params.actionUrls.approve,
      revokeUrl: params.actionUrls.revoke,
      privacyPolicyUrl: getPrivacyPolicyUrl(),
      expiresAt: params.expiresAt,
      noticeVersion: params.noticeVersion,
    });
    await this.send(params.toEmail, rendered, params.idempotencyKey);
  }

  async sendParentalConsentConfirmation(
    params: ParentalConsentConfirmationParams,
  ): Promise<void> {
    if (!params.actionUrls.confirm || !params.actionUrls.revoke) {
      throw new ParentalConsentError(
        'internal',
        'Confirmation notice requires confirm and revoke URLs.',
      );
    }
    const rendered = renderConfirmationNotice({
      environment: this.environment,
      maskedParentEmail: params.maskedParentEmail,
      confirmUrl: params.actionUrls.confirm,
      revokeUrl: params.actionUrls.revoke,
      privacyPolicyUrl: getPrivacyPolicyUrl(),
      expiresAt: params.expiresAt,
      noticeVersion: params.noticeVersion,
    });
    await this.send(params.toEmail, rendered, params.idempotencyKey);
  }

  private async send(
    toEmail: string,
    rendered: { subject: string; html: string; text: string },
    idempotencyKey: string,
  ): Promise<void> {
    const client = this.clientFactory(this.apiKey);
    const { error } = await client.emails.send(
      {
        from: getConsentEmailFrom(),
        to: [toEmail],
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      },
      { idempotencyKey },
    );
    if (error) {
      throw new ParentalConsentError(
        'internal',
        `Email provider error: ${error.name ?? 'unknown'}`,
      );
    }
  }
}
