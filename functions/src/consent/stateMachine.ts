import type {
  AccountBinding,
  ParentalConsentRequest,
  ParentalConsentStatus,
} from '../domain/parentalConsent';
import { ParentalConsentError } from '../domain/parentalConsent';
import { REQUIRE_CONFIRMATION_FOR_APPROVAL } from '../config/consentPolicy';

export type ConsentTransition =
  | 'processInitialConsent'
  | 'processConfirmation'
  | 'revoke'
  | 'expire';

export interface TransitionResult {
  status: ParentalConsentStatus;
  changed: boolean;
  initialConsentAt?: Date;
  confirmedAt?: Date;
  revokedAt?: Date;
}

const REVOCABLE: ReadonlySet<ParentalConsentStatus> = new Set([
  'pending',
  'initial_consent_received',
  'approved',
]);

const EXPIRABLE: ReadonlySet<ParentalConsentStatus> = new Set([
  'pending',
  'initial_consent_received',
  'approved',
]);

export function canExpire(
  status: ParentalConsentStatus,
  accountBinding: AccountBinding,
  now: Date,
  expiresAt: Date,
): boolean {
  if (now < expiresAt) {
    return false;
  }
  if (!EXPIRABLE.has(status)) {
    return false;
  }
  // Bound approved requests are not auto-expired by TTL in 6.5A.
  if (status === 'approved' && accountBinding.state === 'bound') {
    return false;
  }
  return true;
}

export function applyExpiryIfNeeded(
  request: Pick<
    ParentalConsentRequest,
    'status' | 'accountBinding' | 'expiresAt'
  >,
  now: Date = new Date(),
): TransitionResult {
  if (
    canExpire(request.status, request.accountBinding, now, request.expiresAt)
  ) {
    return { status: 'expired', changed: request.status !== 'expired' };
  }
  return { status: request.status, changed: false };
}

export function transitionConsent(
  current: ParentalConsentStatus,
  action: ConsentTransition,
  now: Date = new Date(),
): TransitionResult {
  switch (action) {
    case 'processInitialConsent': {
      if (current === 'initial_consent_received' || current === 'approved') {
        return { status: current, changed: false };
      }
      if (current !== 'pending') {
        throw new ParentalConsentError(
          'failed_precondition',
          `Cannot record initial consent from status ${current}.`,
        );
      }
      return {
        status: 'initial_consent_received',
        changed: true,
        initialConsentAt: now,
      };
    }
    case 'processConfirmation': {
      if (current === 'approved') {
        return { status: 'approved', changed: false };
      }
      if (!REQUIRE_CONFIRMATION_FOR_APPROVAL && current === 'pending') {
        return {
          status: 'approved',
          changed: true,
          confirmedAt: now,
        };
      }
      if (current !== 'initial_consent_received') {
        throw new ParentalConsentError(
          'failed_precondition',
          `Cannot confirm consent from status ${current}.`,
        );
      }
      return {
        status: 'approved',
        changed: true,
        confirmedAt: now,
      };
    }
    case 'revoke': {
      if (current === 'revoked') {
        return { status: 'revoked', changed: false };
      }
      if (!REVOCABLE.has(current)) {
        throw new ParentalConsentError(
          'failed_precondition',
          `Cannot revoke consent from status ${current}.`,
        );
      }
      return {
        status: 'revoked',
        changed: true,
        revokedAt: now,
      };
    }
    case 'expire': {
      if (current === 'expired') {
        return { status: 'expired', changed: false };
      }
      if (current === 'revoked') {
        throw new ParentalConsentError(
          'failed_precondition',
          'Cannot expire a revoked consent request.',
        );
      }
      return { status: 'expired', changed: true };
    }
    default: {
      const _exhaustive: never = action;
      throw new ParentalConsentError(
        'internal',
        `Unknown transition ${_exhaustive}`,
      );
    }
  }
}
