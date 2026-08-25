import {
  MAX_CREATES_PER_EMAIL_HASH,
  MAX_CREATES_PER_IP,
  NOTICE_VERSION,
} from '../config/consentPolicy';
import {
  buildConsentActionUrls,
  getConsentHostingBaseUrl,
  noticeIdempotencyKey,
} from '../config/emailConfig';
import { ParentalConsentError } from '../domain/parentalConsent';
import type { ConsentServiceDeps } from './createRequest';
import { maskParentEmail } from './maskEmail';
import { toCanonicalParentEmail } from './normalizeEmail';
import { hashParentEmailForAbuseKey } from './parentEmailHash';
import { applyExpiryIfNeeded } from './stateMachine';
import { sealToken } from './tokenSeal';
import { assertTokenMatches, generateOpaqueToken } from './tokens';
import { Timestamp } from 'firebase-admin/firestore';

export interface UpdateParentalConsentEmailInput {
  requestId: string;
  clientSessionToken: string;
  parentEmail: string;
  clientIp?: string;
}

export interface UpdateParentalConsentEmailResult {
  maskedParentEmail: string;
  noticeDeliveryStatus: string;
}

export async function updateParentalConsentEmail(
  deps: ConsentServiceDeps,
  input: UpdateParentalConsentEmailInput,
): Promise<UpdateParentalConsentEmailResult> {
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
      'Parent email can only be changed while the request is pending.',
    );
  }

  const canonicalEmail = toCanonicalParentEmail(input.parentEmail);
  const parentEmailHash = hashParentEmailForAbuseKey(
    canonicalEmail,
    deps.hmacSecret,
  );
  const masked = maskParentEmail(canonicalEmail);

  await deps.rateLimiter.consume({
    kind: 'create:email',
    key: parentEmailHash,
    limit: MAX_CREATES_PER_EMAIL_HASH,
  });
  if (input.clientIp) {
    await deps.rateLimiter.consume({
      kind: 'create:ip',
      key: input.clientIp,
      limit: MAX_CREATES_PER_IP,
    });
  }

  const approval = generateOpaqueToken('approval');
  const revoke = generateOpaqueToken('revoke');
  const noticeDeliveryVersion = (raw.noticeDeliveryVersion ?? 1) + 1;

  await deps.repository.updateFields(input.requestId, {
    parentEmail: canonicalEmail,
    parentEmailHash,
    maskedParentEmail: masked,
    approvalTokenHash: approval.tokenHash,
    revokeTokenHash: revoke.tokenHash,
    revokeTokenSealed: sealToken(revoke.rawToken, deps.sealSecret),
    noticeDeliveryVersion,
    noticeDeliveryStatus: 'pending',
    noticeLastErrorCode: null,
  });

  const actionUrls = buildConsentActionUrls({
    hostingBaseUrl: getConsentHostingBaseUrl(process.env, deps.environment),
    approvalToken: approval.rawToken,
    revokeToken: revoke.rawToken,
  });

  try {
    await deps.emailSender.sendParentalConsentNotice({
      requestId: input.requestId,
      toEmail: canonicalEmail,
      maskedParentEmail: masked,
      idempotencyKey: noticeIdempotencyKey(input.requestId, noticeDeliveryVersion),
      actionUrls,
      noticeVersion: NOTICE_VERSION,
      expiresAt: raw.expiresAt.toDate(),
      approvalToken: approval.rawToken,
      revokeToken: revoke.rawToken,
    });
    await deps.repository.updateFields(input.requestId, {
      noticeDeliveryStatus: 'sent',
      noticeSentAt: Timestamp.fromDate(now),
      noticeLastErrorCode: null,
    });
    return { maskedParentEmail: masked, noticeDeliveryStatus: 'sent' };
  } catch (error) {
    const code =
      error instanceof ParentalConsentError ? error.code : 'provider_error';
    await deps.repository.updateFields(input.requestId, {
      noticeDeliveryStatus: 'failed_transient',
      noticeLastErrorCode: String(code).slice(0, 64),
    });
    return {
      maskedParentEmail: masked,
      noticeDeliveryStatus: 'failed_transient',
    };
  }
}
