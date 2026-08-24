/**
 * Server-owned parental consent domain types.
 * Independent of Firestore DTOs (ADR-001 / ADR-008).
 */

export type ParentalConsentStatus =
  | 'pending'
  | 'initial_consent_received'
  | 'approved'
  | 'expired'
  | 'revoked';

export type ParentalConsentMethod = 'email_plus';

/** Orthogonal to status — never a status enum value. */
export type AccountBinding =
  | { state: 'unbound' }
  | { state: 'bound'; claimedByUid: string; claimedAt: Date };

export interface ParentalConsentRequest {
  requestId: string;
  status: ParentalConsentStatus;
  consentMethod: ParentalConsentMethod;
  noticeVersion: string;
  maskedParentEmail: string;
  requestedAt: Date;
  expiresAt: Date;
  initialConsentAt?: Date;
  confirmationSentAt?: Date;
  confirmedAt?: Date;
  revokedAt?: Date;
  accountBinding: AccountBinding;
}

export type ParentalConsentTokenPurpose =
  | 'clientSession'
  | 'approval'
  | 'confirmation'
  | 'revoke';

export type ConsentErrorCode =
  | 'invalid_argument'
  | 'unauthenticated'
  | 'not_found'
  | 'permission_denied'
  | 'failed_precondition'
  | 'resource_exhausted'
  | 'already_bound'
  | 'invalid_token'
  | 'expired'
  | 'revoked'
  | 'internal';

export class ParentalConsentError extends Error {
  readonly code: ConsentErrorCode;

  constructor(code: ConsentErrorCode, message: string) {
    super(message);
    this.name = 'ParentalConsentError';
    this.code = code;
  }
}
