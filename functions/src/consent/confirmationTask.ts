import { Timestamp } from 'firebase-admin/firestore';

import {
  NOTICE_VERSION,
  REQUIRE_CONFIRMATION_FOR_APPROVAL,
} from '../config/consentPolicy';
import {
  buildConsentActionUrls,
  confirmationIdempotencyKey,
  getConsentHostingBaseUrl,
} from '../config/emailConfig';
import { ParentalConsentError } from '../domain/parentalConsent';
import type { ConsentServiceDeps } from './createRequest';
import { applyExpiryIfNeeded, transitionConsent } from './stateMachine';
import { unsealToken } from './tokenSeal';

/**
 * Task Queue handler: send the delayed confirmatory notice (revoke link).
 * When two-step policy is on, also includes the confirmation capability.
 * Retry-safe: same idempotency key; no-op after confirmationSentAt.
 */
export async function sendScheduledConfirmationEmail(
  deps: ConsentServiceDeps,
  params: { requestId: string; confirmationDeliveryVersion: number },
): Promise<{ sent: boolean }> {
  const raw = await deps.repository.requireRaw(params.requestId);
  const domain = deps.repository.toDomain(raw);
  const now = deps.now?.() ?? new Date();

  const expiry = applyExpiryIfNeeded(domain, now);
  if (expiry.changed || domain.status === 'expired') {
    if (expiry.changed) {
      await deps.repository.updateFields(params.requestId, { status: 'expired' });
    }
    return { sent: false };
  }

  if (domain.status === 'revoked') {
    return { sent: false };
  }

  if (
    raw.confirmationDeliveryVersion !== params.confirmationDeliveryVersion
  ) {
    return { sent: false };
  }

  if (raw.confirmationSentAt) {
    return { sent: false };
  }

  if (!REQUIRE_CONFIRMATION_FOR_APPROVAL && domain.status === 'initial_consent_received') {
    const migrated = transitionConsent(domain.status, 'processInitialConsent', now);
    if (migrated.changed) {
      const update: {
        status: typeof migrated.status;
        confirmedAt?: Timestamp;
      } = { status: migrated.status };
      if (migrated.confirmedAt) {
        update.confirmedAt = Timestamp.fromDate(migrated.confirmedAt);
      }
      await deps.repository.updateFields(params.requestId, update);
      domain.status = migrated.status;
    }
  }

  if (REQUIRE_CONFIRMATION_FOR_APPROVAL) {
    if (domain.status !== 'initial_consent_received') {
      return { sent: false };
    }
  } else if (domain.status !== 'approved') {
    return { sent: false };
  }

  let confirmationToken: string | undefined;
  if (REQUIRE_CONFIRMATION_FOR_APPROVAL) {
    if (!raw.confirmationTokenSealed) {
      throw new ParentalConsentError(
        'internal',
        'Confirmation token seal missing for scheduled send.',
      );
    }
    confirmationToken = unsealToken(
      raw.confirmationTokenSealed,
      deps.sealSecret,
    );
  }

  let revokeToken: string | undefined;
  if (raw.revokeTokenSealed) {
    revokeToken = unsealToken(raw.revokeTokenSealed, deps.sealSecret);
  }
  if (!revokeToken) {
    throw new ParentalConsentError(
      'internal',
      'Revoke token seal missing for scheduled confirmation notice.',
    );
  }

  const actionUrls = buildConsentActionUrls({
    hostingBaseUrl: getConsentHostingBaseUrl(process.env, deps.environment),
    confirmationToken,
    revokeToken,
  });

  try {
    await deps.emailSender.sendParentalConsentConfirmation({
      requestId: params.requestId,
      toEmail: raw.parentEmail,
      maskedParentEmail: raw.maskedParentEmail,
      idempotencyKey: confirmationIdempotencyKey(
        params.requestId,
        params.confirmationDeliveryVersion,
      ),
      actionUrls,
      noticeVersion: raw.noticeVersion || NOTICE_VERSION,
      expiresAt: raw.expiresAt.toDate(),
      confirmationToken,
      revokeToken,
    });

    await deps.repository.updateFields(params.requestId, {
      confirmationSentAt: Timestamp.fromDate(now),
      confirmationDeliveryStatus: 'sent',
      confirmationLastErrorCode: null,
      confirmationTokenSealed: null,
    });
    return { sent: true };
  } catch (error) {
    const code =
      error instanceof ParentalConsentError ? error.code : 'provider_error';
    await deps.repository.updateFields(params.requestId, {
      confirmationDeliveryStatus: 'failed_transient',
      confirmationLastErrorCode: String(code).slice(0, 64),
    });
    throw error;
  }
}

/** In-memory scheduler for unit tests / emulator without Cloud Tasks. */
export class ImmediateConfirmationScheduler {
  constructor(
    private readonly run: (params: {
      requestId: string;
      confirmationDeliveryVersion: number;
    }) => Promise<void>,
  ) {}

  async enqueueConfirmationEmail(params: {
    requestId: string;
    confirmationDeliveryVersion: number;
    delayMs: number;
  }): Promise<void> {
    void params.delayMs;
    await this.run({
      requestId: params.requestId,
      confirmationDeliveryVersion: params.confirmationDeliveryVersion,
    });
  }
}

/** Records enqueues without sending — tests assert scheduling separately. */
export class RecordingConfirmationScheduler {
  readonly enqueued: Array<{
    requestId: string;
    confirmationDeliveryVersion: number;
    delayMs: number;
  }> = [];

  async enqueueConfirmationEmail(params: {
    requestId: string;
    confirmationDeliveryVersion: number;
    delayMs: number;
  }): Promise<void> {
    this.enqueued.push(params);
  }
}
