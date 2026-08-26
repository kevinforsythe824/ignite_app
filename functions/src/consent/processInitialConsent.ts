import { Timestamp } from 'firebase-admin/firestore';

import { MAX_TOKEN_FAILURES_PER_IP, REQUIRE_CONFIRMATION_FOR_APPROVAL, getConfirmationEmailDelayMs } from '../config/consentPolicy';
import { ParentalConsentError } from '../domain/parentalConsent';
import type { ConsentServiceDeps } from './createRequest';
import type { ParentalConsentFirestoreDocument } from './repository';
import { applyExpiryIfNeeded, transitionConsent } from './stateMachine';
import { sealToken } from './tokenSeal';
import { assertTokenMatches, generateOpaqueToken, hashToken } from './tokens';

type TokenHashField =
  | 'approvalTokenHash'
  | 'confirmationTokenHash'
  | 'revokeTokenHash';

export async function processInitialConsent(
  deps: ConsentServiceDeps,
  approvalToken: string,
  clientIp?: string,
): Promise<{ requestId: string; status: string }> {
  const found = await resolveByToken(
    deps,
    approvalToken,
    'approvalTokenHash',
    'approval',
    clientIp,
  );

  const now = deps.now?.() ?? new Date();
  const result = await deps.repository.runTransaction(found.requestId, (raw) => {
    assertTokenMatches(approvalToken, raw.approvalTokenHash, 'approval');
    return applyTransitionUpdate(deps, raw, 'processInitialConsent', now);
  });

  if (result.changed && shouldScheduleConfirmationNotice(result.status)) {
    const confirmationDeliveryVersion = 1;
    const fields: Partial<ParentalConsentFirestoreDocument> = {
      confirmationDeliveryVersion,
      confirmationScheduledAt: Timestamp.fromDate(now),
      confirmationDeliveryStatus: 'scheduled',
      confirmationLastErrorCode: null,
      confirmationSentAt: null,
    };
    if (REQUIRE_CONFIRMATION_FOR_APPROVAL) {
      const confirmation = generateOpaqueToken('confirmation');
      fields.confirmationTokenHash = confirmation.tokenHash;
      fields.confirmationTokenSealed = sealToken(
        confirmation.rawToken,
        deps.sealSecret,
      );
    }
    await deps.repository.updateFields(found.requestId, fields);
    await deps.confirmationScheduler.enqueueConfirmationEmail({
      requestId: found.requestId,
      confirmationDeliveryVersion,
      delayMs: getConfirmationEmailDelayMs(deps.environment),
    });
  }

  return { requestId: result.requestId, status: result.status };
}

function shouldScheduleConfirmationNotice(status: string): boolean {
  return (
    status === 'approved' || status === 'initial_consent_received'
  );
}

export async function processConfirmation(
  deps: ConsentServiceDeps,
  confirmationToken: string,
  clientIp?: string,
): Promise<{ requestId: string; status: string }> {
  const found = await resolveByToken(
    deps,
    confirmationToken,
    'confirmationTokenHash',
    'confirmation',
    clientIp,
  );

  const now = deps.now?.() ?? new Date();
  return deps.repository.runTransaction(found.requestId, (raw) => {
    assertTokenMatches(
      confirmationToken,
      raw.confirmationTokenHash ?? '',
      'confirmation',
    );
    return applyTransitionUpdate(deps, raw, 'processConfirmation', now);
  });
}

export async function revokeConsent(
  deps: ConsentServiceDeps,
  revokeToken: string,
  clientIp?: string,
): Promise<{ requestId: string; status: string }> {
  const found = await resolveByToken(
    deps,
    revokeToken,
    'revokeTokenHash',
    'revoke',
    clientIp,
  );

  const now = deps.now?.() ?? new Date();
  return deps.repository.runTransaction(found.requestId, (raw) => {
    assertTokenMatches(revokeToken, raw.revokeTokenHash, 'revoke');
    return applyTransitionUpdate(deps, raw, 'revoke', now);
  });
}

async function resolveByToken(
  deps: ConsentServiceDeps,
  token: string,
  field: TokenHashField,
  purpose: 'approval' | 'confirmation' | 'revoke',
  clientIp?: string,
): Promise<ParentalConsentFirestoreDocument & { requestId: string }> {
  if (!token) {
    throw new ParentalConsentError('invalid_argument', 'token is required.');
  }

  const tokenHash = hashToken(token);
  const found = await deps.repository.findByTokenHash(field, tokenHash);
  if (!found) {
    if (clientIp) {
      await deps.rateLimiter.consume({
        kind: 'tokenFail:ip',
        key: clientIp,
        limit: MAX_TOKEN_FAILURES_PER_IP,
      });
    }
    throw new ParentalConsentError('invalid_token', `Invalid ${purpose} token.`);
  }
  return found;
}

function applyTransitionUpdate(
  deps: ConsentServiceDeps,
  raw: ParentalConsentFirestoreDocument & { requestId: string },
  action: 'processInitialConsent' | 'processConfirmation' | 'revoke',
  now: Date,
): {
  update: Partial<ParentalConsentFirestoreDocument>;
  result: { requestId: string; status: string; changed: boolean };
} {
  const domain = deps.repository.toDomain(raw);
  const expiry = applyExpiryIfNeeded(domain, now);
  if (expiry.changed) {
    return {
      update: { status: 'expired' },
      result: { requestId: raw.requestId, status: 'expired', changed: true },
    };
  }

  const transition = transitionConsent(domain.status, action, now);
  const update: Partial<ParentalConsentFirestoreDocument> = {};
  if (transition.changed) {
    update.status = transition.status;
    if (transition.initialConsentAt) {
      update.initialConsentAt = Timestamp.fromDate(transition.initialConsentAt);
    }
    if (transition.confirmedAt) {
      update.confirmedAt = Timestamp.fromDate(transition.confirmedAt);
    }
    if (transition.revokedAt) {
      update.revokedAt = Timestamp.fromDate(transition.revokedAt);
    }
  }

  return {
    update,
    result: {
      requestId: raw.requestId,
      status: transition.status,
      changed: transition.changed,
    },
  };
}
