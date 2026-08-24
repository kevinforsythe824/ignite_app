import {
  MAX_CREATES_PER_EMAIL_HASH,
  MAX_CREATES_PER_IP,
} from '../config/consentPolicy';
import { ParentalConsentError } from '../domain/parentalConsent';
import type { ConsentServiceDeps } from './createRequest';
import { maskParentEmail } from './maskEmail';
import { toCanonicalParentEmail } from './normalizeEmail';
import { hashParentEmailForAbuseKey } from './parentEmailHash';
import { applyExpiryIfNeeded } from './stateMachine';
import { assertTokenMatches, generateOpaqueToken } from './tokens';

export interface UpdateParentalConsentEmailInput {
  requestId: string;
  clientSessionToken: string;
  parentEmail: string;
  clientIp?: string;
}

export interface UpdateParentalConsentEmailResult {
  maskedParentEmail: string;
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

  await deps.repository.updateFields(input.requestId, {
    parentEmail: canonicalEmail,
    parentEmailHash,
    maskedParentEmail: masked,
    approvalTokenHash: approval.tokenHash,
    revokeTokenHash: revoke.tokenHash,
  });

  await deps.emailSender.sendParentalConsentNotice({
    requestId: input.requestId,
    maskedParentEmail: masked,
    approvalToken: approval.rawToken,
    revokeToken: revoke.rawToken,
  });

  return { maskedParentEmail: masked };
}
