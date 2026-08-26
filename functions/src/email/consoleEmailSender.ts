import type { IgniteEnvironmentName } from '../config/environment';
import { readIgniteEnvironment } from '../config/environment';
import {
  getConsentEmailFrom,
  getPrivacyPolicyUrl,
} from '../config/emailConfig';
import type {
  EmailSender,
  ParentalConsentConfirmationParams,
  ParentalConsentNoticeParams,
} from './emailSender';
import { renderConfirmationNotice } from './templates/confirmationNotice';
import { renderInitialNotice } from './templates/initialNotice';

/**
 * DEV / emulator email sender.
 * Logs only masked metadata — never raw tokens or full parent email.
 */
export class ConsoleEmailSender implements EmailSender {
  constructor(
    private readonly log: (message: string) => void = console.info,
    private readonly environment: IgniteEnvironmentName = readIgniteEnvironment(),
  ) {}

  async sendParentalConsentNotice(
    params: ParentalConsentNoticeParams,
  ): Promise<void> {
    // Touch template render so misconfigured URLs fail in tests without logging secrets.
    renderInitialNotice({
      environment: this.environment,
      maskedParentEmail: params.maskedParentEmail,
      approveUrl: params.actionUrls.approve ?? '',
      revokeUrl: params.actionUrls.revoke ?? '',
      privacyPolicyUrl: getPrivacyPolicyUrl(),
      expiresAt: params.expiresAt,
      noticeVersion: params.noticeVersion,
    });
    this.log(
      `[IgniteConsent] notice requestId=${params.requestId} to=${params.maskedParentEmail} key=${params.idempotencyKey}`,
    );
  }

  async sendParentalConsentConfirmation(
    params: ParentalConsentConfirmationParams,
  ): Promise<void> {
    renderConfirmationNotice({
      environment: this.environment,
      maskedParentEmail: params.maskedParentEmail,
      confirmUrl: params.actionUrls.confirm,
      revokeUrl: params.actionUrls.revoke ?? '',
      privacyPolicyUrl: getPrivacyPolicyUrl(),
      expiresAt: params.expiresAt,
      noticeVersion: params.noticeVersion,
    });
    this.log(
      `[IgniteConsent] confirmation requestId=${params.requestId} to=${params.maskedParentEmail} key=${params.idempotencyKey}`,
    );
  }
}

/** Exported for tests that assert from-address config is readable without sending. */
export function resolveConsoleFromAddress(): string {
  return getConsentEmailFrom();
}
