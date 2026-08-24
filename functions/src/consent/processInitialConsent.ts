import { Timestamp } from 'firebase-admin/firestore';

import { MAX_TOKEN_FAILURES_PER_IP } from '../config/consentPolicy';
import { ParentalConsentError } from '../domain/parentalConsent';
import type { ConsentServiceDeps } from './createRequest';
import type { ParentalConsentFirestoreDocument } from './repository';
import { applyExpiryIfNeeded, transitionConsent } from './stateMachine';
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

  if (result.status === 'initial_consent_received') {
    // Issue (or rotate) confirmation capability only after initial consent.
    const confirmation = generateOpaqueToken('confirmation');
    await deps.repository.updateFields(found.requestId, {
      confirmationTokenHash: confirmation.tokenHash,
      confirmationSentAt: Timestamp.fromDate(now),
    });
    await deps.emailSender.sendParentalConsentConfirmation({
      requestId: found.requestId,
      maskedParentEmail: found.maskedParentEmail,
      confirmationToken: confirmation.rawToken,
      revokeToken: undefined,
    });
  }

  return result;
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
    assertTokenMatches(confirmationToken, raw.confirmationTokenHash, 'confirmation');
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
    // Single-purpose: only revokeTokenHash authorizes revoke.
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
  result: { requestId: string; status: string };
} {
  const domain = deps.repository.toDomain(raw);
  const expiry = applyExpiryIfNeeded(domain, now);
  if (expiry.changed) {
    return {
      update: { status: 'expired' },
      result: { requestId: raw.requestId, status: 'expired' },
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
    },
  };
}
