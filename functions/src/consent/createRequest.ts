import type { Firestore } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';

import {
  MAX_CREATES_PER_EMAIL_HASH,
  MAX_CREATES_PER_IP,
  NOTICE_VERSION,
  REQUEST_TTL_MS,
  getConfirmationEmailDelayMs,
} from '../config/consentPolicy';
import type { IgniteEnvironmentName } from '../config/environment';
import {
  buildConsentActionUrls,
  getConsentHostingBaseUrl,
  noticeIdempotencyKey,
} from '../config/emailConfig';
import type { EmailSender } from '../email/emailSender';
import { ParentalConsentError } from '../domain/parentalConsent';
import { maskParentEmail } from './maskEmail';
import { toCanonicalParentEmail } from './normalizeEmail';
import { hashParentEmailForAbuseKey } from './parentEmailHash';
import type { RateLimiter } from './rateLimiter';
import type { ParentalConsentRepositoryPort } from './repository';
import { sealToken } from './tokenSeal';
import { generateOpaqueToken, generateRequestId } from './tokens';

export interface CreateParentalConsentRequestInput {
  parentEmail: string;
  clientIp?: string;
}

export interface CreateParentalConsentRequestResult {
  requestId: string;
  clientSessionToken: string;
  status: 'pending';
  maskedParentEmail: string;
  expiresAt: string;
  noticeDeliveryStatus: 'pending' | 'sent' | 'failed_transient' | 'failed_permanent';
}

export interface ConfirmationScheduler {
  enqueueConfirmationEmail(params: {
    requestId: string;
    confirmationDeliveryVersion: number;
    delayMs: number;
  }): Promise<void>;
}

export interface ConsentServiceDeps {
  repository: ParentalConsentRepositoryPort;
  rateLimiter: RateLimiter;
  emailSender: EmailSender;
  environment: IgniteEnvironmentName;
  hmacSecret: string;
  sealSecret: string;
  confirmationScheduler: ConfirmationScheduler;
  db?: Firestore;
  now?: () => Date;
}

export async function createParentalConsentRequest(
  deps: ConsentServiceDeps,
  input: CreateParentalConsentRequestInput,
): Promise<CreateParentalConsentRequestResult> {
  const now = deps.now?.() ?? new Date();
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

  const requestId = generateRequestId();
  const clientSession = generateOpaqueToken('clientSession');
  const approval = generateOpaqueToken('approval');
  const revoke = generateOpaqueToken('revoke');
  const expiresAt = new Date(now.getTime() + REQUEST_TTL_MS);
  const noticeDeliveryVersion = 1;

  const revokeSealed = sealToken(revoke.rawToken, deps.sealSecret);

  await deps.repository.create({
    requestId,
    parentEmail: canonicalEmail,
    parentEmailHash,
    maskedParentEmail: masked,
    noticeVersion: NOTICE_VERSION,
    environment: deps.environment,
    requestedAt: now,
    expiresAt,
    noticeDeliveryVersion,
    noticeDeliveryStatus: 'pending',
    tokens: {
      clientSessionTokenHash: clientSession.tokenHash,
      approvalTokenHash: approval.tokenHash,
      confirmationTokenHash: null,
      revokeTokenHash: revoke.tokenHash,
    },
  });

  await deps.repository.updateFields(requestId, {
    revokeTokenSealed: revokeSealed,
  });

  const actionUrls = buildConsentActionUrls({
    hostingBaseUrl: getConsentHostingBaseUrl(process.env, deps.environment),
    approvalToken: approval.rawToken,
    revokeToken: revoke.rawToken,
  });

  let noticeDeliveryStatus: CreateParentalConsentRequestResult['noticeDeliveryStatus'] =
    'pending';
  try {
    await deps.emailSender.sendParentalConsentNotice({
      requestId,
      toEmail: canonicalEmail,
      maskedParentEmail: masked,
      idempotencyKey: noticeIdempotencyKey(requestId, noticeDeliveryVersion),
      actionUrls,
      noticeVersion: NOTICE_VERSION,
      expiresAt,
      approvalToken: approval.rawToken,
      revokeToken: revoke.rawToken,
    });
    noticeDeliveryStatus = 'sent';
    await deps.repository.updateFields(requestId, {
      noticeDeliveryStatus: 'sent',
      noticeSentAt: Timestamp.fromDate(now),
      noticeLastErrorCode: null,
    });
  } catch (error) {
    const code =
      error instanceof ParentalConsentError ? error.code : 'provider_error';
    noticeDeliveryStatus = 'failed_transient';
    await deps.repository.updateFields(requestId, {
      noticeDeliveryStatus: 'failed_transient',
      noticeLastErrorCode: String(code).slice(0, 64),
    });
  }

  // Always return the durable request — delivery failure does not create duplicates on retry.
  return {
    requestId,
    clientSessionToken: clientSession.rawToken,
    status: 'pending',
    maskedParentEmail: masked,
    expiresAt: expiresAt.toISOString(),
    noticeDeliveryStatus,
  };
}

/** Re-export for callers that need policy delay with deps.environment. */
export { getConfirmationEmailDelayMs };
