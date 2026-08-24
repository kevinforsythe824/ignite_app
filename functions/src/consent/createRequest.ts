import type { Firestore } from 'firebase-admin/firestore';

import {
  MAX_CREATES_PER_EMAIL_HASH,
  MAX_CREATES_PER_IP,
  NOTICE_VERSION,
  REQUEST_TTL_MS,
} from '../config/consentPolicy';
import type { IgniteEnvironmentName } from '../config/environment';
import type { EmailSender } from '../email/emailSender';
import { maskParentEmail } from './maskEmail';
import { toCanonicalParentEmail } from './normalizeEmail';
import { hashParentEmailForAbuseKey } from './parentEmailHash';
import type { RateLimiter } from './rateLimiter';
import type { ParentalConsentRepositoryPort } from './repository';
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
}

export interface ConsentServiceDeps {
  repository: ParentalConsentRepositoryPort;
  rateLimiter: RateLimiter;
  emailSender: EmailSender;
  environment: IgniteEnvironmentName;
  hmacSecret: string;
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
  const confirmation = generateOpaqueToken('confirmation');
  const revoke = generateOpaqueToken('revoke');
  const expiresAt = new Date(now.getTime() + REQUEST_TTL_MS);

  await deps.repository.create({
    requestId,
    parentEmail: canonicalEmail,
    parentEmailHash,
    maskedParentEmail: masked,
    noticeVersion: NOTICE_VERSION,
    environment: deps.environment,
    requestedAt: now,
    expiresAt,
    tokens: {
      clientSessionTokenHash: clientSession.tokenHash,
      approvalTokenHash: approval.tokenHash,
      confirmationTokenHash: confirmation.tokenHash,
      revokeTokenHash: revoke.tokenHash,
    },
  });

  await deps.emailSender.sendParentalConsentNotice({
    requestId,
    maskedParentEmail: masked,
    approvalToken: approval.rawToken,
    revokeToken: revoke.rawToken,
  });

  return {
    requestId,
    clientSessionToken: clientSession.rawToken,
    status: 'pending',
    maskedParentEmail: masked,
    expiresAt: expiresAt.toISOString(),
  };
}
