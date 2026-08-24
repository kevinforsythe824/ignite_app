import { Timestamp } from 'firebase-admin/firestore';

import {
  MAX_RESENDS_PER_EMAIL_HASH,
  MAX_RESENDS_PER_REQUEST,
  RESEND_COOLDOWN_MS,
} from '../config/consentPolicy';
import { ParentalConsentError } from '../domain/parentalConsent';
import type { ConsentServiceDeps } from './createRequest';
import { applyExpiryIfNeeded } from './stateMachine';
import { assertTokenMatches, generateOpaqueToken } from './tokens';

export interface ResendParentalConsentNoticeInput {
  requestId: string;
  clientSessionToken: string;
  clientIp?: string;
}

export async function resendParentalConsentNotice(
  deps: ConsentServiceDeps,
  input: ResendParentalConsentNoticeInput,
): Promise<void> {
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

  await deps.repository.updateFields(input.requestId, {
    approvalTokenHash: approval.tokenHash,
    resendCount: raw.resendCount + 1,
    lastResendAt: Timestamp.fromDate(now),
  });

  await deps.emailSender.sendParentalConsentNotice({
    requestId: input.requestId,
    maskedParentEmail: raw.maskedParentEmail,
    approvalToken: approval.rawToken,
    // Revoke token is not rotated on resend; parent still uses original revoke capability.
  });
}
