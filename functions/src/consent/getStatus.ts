import { Timestamp } from 'firebase-admin/firestore';

import { ParentalConsentError } from '../domain/parentalConsent';
import type { ConsentServiceDeps } from './createRequest';
import { applyExpiryIfNeeded } from './stateMachine';
import { assertTokenMatches } from './tokens';

export interface GetParentalConsentStatusInput {
  requestId: string;
  clientSessionToken: string;
}

export interface GetParentalConsentStatusResult {
  status: string;
  maskedParentEmail: string;
  expiresAt: string;
  bindingState: 'unbound' | 'bound';
}

export async function getParentalConsentStatus(
  deps: ConsentServiceDeps,
  input: GetParentalConsentStatusInput,
): Promise<GetParentalConsentStatusResult> {
  if (!input.requestId || !input.clientSessionToken) {
    throw new ParentalConsentError(
      'invalid_argument',
      'requestId and clientSessionToken are required.',
    );
  }

  const raw = await deps.repository.requireRaw(input.requestId);
  assertTokenMatches(
    input.clientSessionToken,
    raw.clientSessionTokenHash,
    'clientSession',
  );

  const domain = deps.repository.toDomain(raw);
  const now = deps.now?.() ?? new Date();
  const expiry = applyExpiryIfNeeded(domain, now);

  if (expiry.changed) {
    await deps.repository.updateFields(input.requestId, {
      status: 'expired',
    });
    domain.status = 'expired';
  }

  return {
    status: domain.status,
    maskedParentEmail: domain.maskedParentEmail,
    expiresAt: domain.expiresAt.toISOString(),
    bindingState: domain.accountBinding.state,
  };
}

export { Timestamp };
