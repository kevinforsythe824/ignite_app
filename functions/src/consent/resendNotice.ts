import { Timestamp } from 'firebase-admin/firestore';

import {
  MAX_RESENDS_PER_EMAIL_HASH,
  MAX_RESENDS_PER_REQUEST,
  NOTICE_VERSION,
  RESEND_COOLDOWN_MS,
} from '../config/consentPolicy';
import {
  buildConsentActionUrls,
  getConsentHostingBaseUrl,
  noticeIdempotencyKey,
} from '../config/emailConfig';
import { ParentalConsentError } from '../domain/parentalConsent';
import type { ConsentServiceDeps } from './createRequest';
import { applyExpiryIfNeeded } from './stateMachine';
import { unsealToken } from './tokenSeal';
import { assertTokenMatches, generateOpaqueToken } from './tokens';

export interface ResendParentalConsentNoticeInput {
  requestId: string;
  clientSessionToken: string;
  clientIp?: string;
}

export async function resendParentalConsentNotice(
  deps: ConsentServiceDeps,
  input: ResendParentalConsentNoticeInput,
): Promise<{ noticeDeliveryStatus: string }> {
  const raw = await deps.repository.requireRaw(input.requestId);
  assertTokenMatches(
    input.clientSessionToken,
    raw.clientSessionTokenHash,
    'clientSession',
  );

  const domain = deps.repository.toDomain(raw);
  const now = deps.now?.() ?? new Date();
  const expiry = applyExpiryIfNeeded(domain, now);
  if (expiry.changed || domain.status === 'expired') {
    if (expiry.changed) {
      await deps.repository.updateFields(input.requestId, { status: 'expired' });
    }
    throw new ParentalConsentError('expired', 'This consent request has expired.');
  }

  if (domain.status !== 'pending') {
    throw new ParentalConsentError(
      'failed_precondition',
      'Notices can only be resent while the request is pending.',
    );
  }

  if (raw.lastResendAt) {
    const last = raw.lastResendAt.toDate().getTime();
    if (now.getTime() - last < RESEND_COOLDOWN_MS) {
      throw new ParentalConsentError(
        'resource_exhausted',
        'Please wait before requesting another notice.',
      );
    }
  }

  if (raw.resendCount >= MAX_RESENDS_PER_REQUEST) {
    throw new ParentalConsentError(
      'resource_exhausted',
      'Resend limit reached for this request.',
    );
  }

  await deps.rateLimiter.consume({
    kind: 'resend:email',
    key: raw.parentEmailHash,
    limit: MAX_RESENDS_PER_EMAIL_HASH,
  });

  const approval = generateOpaqueToken('approval');
  const noticeDeliveryVersion = (raw.noticeDeliveryVersion ?? 1) + 1;

  // Revoke capability is not rotated on resend; reconstruct URL from sealed token.
  if (!raw.revokeTokenSealed) {
    throw new ParentalConsentError(
      'internal',
      'Revoke capability seal missing for resend.',
    );
  }
  const revokeToken = unsealToken(raw.revokeTokenSealed, deps.sealSecret);

  await deps.repository.updateFields(input.requestId, {
    approvalTokenHash: approval.tokenHash,
    resendCount: raw.resendCount + 1,
    lastResendAt: Timestamp.fromDate(now),
    noticeDeliveryVersion,
    noticeDeliveryStatus: 'pending',
    noticeLastErrorCode: null,
  });

  const actionUrls = buildConsentActionUrls({
    hostingBaseUrl: getConsentHostingBaseUrl(process.env, deps.environment),
    approvalToken: approval.rawToken,
    revokeToken,
  });

  try {
    await deps.emailSender.sendParentalConsentNotice({
      requestId: input.requestId,
      toEmail: raw.parentEmail,
      maskedParentEmail: raw.maskedParentEmail,
      idempotencyKey: noticeIdempotencyKey(input.requestId, noticeDeliveryVersion),
      actionUrls,
      noticeVersion: NOTICE_VERSION,
      expiresAt: raw.expiresAt.toDate(),
      approvalToken: approval.rawToken,
      revokeToken,
    });
    await deps.repository.updateFields(input.requestId, {
      noticeDeliveryStatus: 'sent',
      noticeSentAt: Timestamp.fromDate(now),
      noticeLastErrorCode: null,
    });
    return { noticeDeliveryStatus: 'sent' };
  } catch (error) {
    const code =
      error instanceof ParentalConsentError ? error.code : 'provider_error';
    await deps.repository.updateFields(input.requestId, {
      noticeDeliveryStatus: 'failed_transient',
      noticeLastErrorCode: String(code).slice(0, 64),
    });
    return { noticeDeliveryStatus: 'failed_transient' };
  }
}
