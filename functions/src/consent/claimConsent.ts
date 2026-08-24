import { Timestamp } from 'firebase-admin/firestore';

import { ParentalConsentError } from '../domain/parentalConsent';
import type { ConsentServiceDeps } from './createRequest';
import { applyExpiryIfNeeded } from './stateMachine';
import { assertTokenMatches } from './tokens';

export interface ClaimParentalConsentInput {
  requestId: string;
  clientSessionToken: string;
  /** Must come from request.auth.uid — never trust a client uid field. */
  authenticatedUid: string;
}

export interface ClaimParentalConsentResult {
  status: string;
  bindingState: 'bound';
  claimedByUid: string;
}

export async function claimParentalConsent(
  deps: ConsentServiceDeps,
  input: ClaimParentalConsentInput,
): Promise<ClaimParentalConsentResult> {
  if (!input.authenticatedUid) {
    throw new ParentalConsentError(
      'unauthenticated',
      'Authentication is required to claim parental consent.',
    );
  }
  if (!input.requestId || !input.clientSessionToken) {
    throw new ParentalConsentError(
      'invalid_argument',
      'requestId and clientSessionToken are required.',
    );
  }

  const now = deps.now?.() ?? new Date();

  const existing = await deps.repository.requireRaw(input.requestId);
  assertTokenMatches(
    input.clientSessionToken,
    existing.clientSessionTokenHash,
    'clientSession',
  );
  const preview = deps.repository.toDomain(existing);
  const expiry = applyExpiryIfNeeded(preview, now);
  if (expiry.changed) {
    await deps.repository.updateFields(input.requestId, { status: 'expired' });
    throw new ParentalConsentError('expired', 'This consent request has expired.');
  }

  return deps.repository.runTransaction(input.requestId, (raw) => {
    assertTokenMatches(
      input.clientSessionToken,
      raw.clientSessionTokenHash,
      'clientSession',
    );

    const domain = deps.repository.toDomain(raw);
    if (domain.status === 'expired') {
      throw new ParentalConsentError('expired', 'This consent request has expired.');
    }
    if (domain.status === 'revoked') {
      throw new ParentalConsentError(
        'revoked',
        'This consent request has been revoked.',
      );
    }
    if (domain.status !== 'approved') {
      throw new ParentalConsentError(
        'failed_precondition',
        'Consent must be approved before it can be claimed.',
      );
    }

    if (raw.claimedByUid) {
      if (raw.claimedByUid === input.authenticatedUid) {
        return {
          update: {},
          result: {
            status: domain.status,
            bindingState: 'bound' as const,
            claimedByUid: raw.claimedByUid,
          },
        };
      }
      throw new ParentalConsentError(
        'already_bound',
        'This consent request is already bound to another account.',
      );
    }

    return {
      update: {
        claimedByUid: input.authenticatedUid,
        claimedAt: Timestamp.fromDate(now),
      },
      result: {
        status: domain.status,
        bindingState: 'bound' as const,
        claimedByUid: input.authenticatedUid,
      },
    };
  });
}
