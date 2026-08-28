import type { ParentalConsentSnapshot } from '../src/features/parentalConsent/domain/parentalConsentSnapshot';
import { ParentalConsentError } from '../src/features/parentalConsent/errors/parentalConsentError';
import type {
  ClaimParentalConsentResult,
  CreateParentalConsentRequestResult,
  ParentalConsentCredentials,
  ParentalConsentRepository,
  ParentalConsentStatusResult,
  ResendParentalConsentNoticeResult,
  UpdateParentalConsentEmailResult,
} from '../src/features/parentalConsent/repositories/parentalConsentRepository';

export interface ParentalConsentRepositoryFake extends ParentalConsentRepository {
  seedStatus(snapshot: ParentalConsentSnapshot & { requestId?: string }): void;
  setCreateError(error: ParentalConsentError | null): void;
  setGetStatusError(error: ParentalConsentError | null): void;
  setClaimError(error: ParentalConsentError | null): void;
  setClaimResult(result: ClaimParentalConsentResult | null): void;
  /** Call counts for getStatus generations / stale response tests. */
  getStatusCallCount(): number;
  setGetStatusDelay(delay: () => Promise<void>): void;
}

export function createParentalConsentRepositoryFake(options?: {
  initialSnapshot?: ParentalConsentSnapshot;
  createResult?: Partial<CreateParentalConsentRequestResult>;
}): ParentalConsentRepositoryFake {
  let snapshot: ParentalConsentSnapshot = options?.initialSnapshot ?? {
    status: 'pending',
    maskedParentEmail: 'p***@example.com',
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    bindingState: 'unbound',
  };
  let createError: ParentalConsentError | null = null;
  let getStatusError: ParentalConsentError | null = null;
  let claimError: ParentalConsentError | null = null;
  let claimResult: ClaimParentalConsentResult | null = null;
  let getStatusCalls = 0;
  let getStatusDelay: (() => Promise<void>) | null = null;
  let nextRequestId = 1;

  return {
    seedStatus(next) {
      const { requestId: _ignored, ...rest } = next as ParentalConsentSnapshot & {
        requestId?: string;
      };
      snapshot = { ...snapshot, ...rest };
    },
    setCreateError(error) {
      createError = error;
    },
    setGetStatusError(error) {
      getStatusError = error;
    },
    setClaimError(error) {
      claimError = error;
    },
    setClaimResult(result) {
      claimResult = result;
    },
    getStatusCallCount: () => getStatusCalls,
    setGetStatusDelay(delay) {
      getStatusDelay = delay;
    },

    createRequest: jest.fn(async (input) => {
      if (createError) {
        throw createError;
      }
      const requestId = `req-${nextRequestId++}`;
      const result: CreateParentalConsentRequestResult = {
        requestId,
        clientSessionToken: `token-${requestId}`,
        status: 'pending',
        maskedParentEmail: mask(input.parentEmail),
        expiresAt: snapshot.expiresAt,
        bindingState: 'unbound',
        noticeDeliveryStatus: 'sent',
        ...options?.createResult,
      };
      snapshot = {
        status: result.status,
        maskedParentEmail: result.maskedParentEmail,
        expiresAt: result.expiresAt,
        bindingState: result.bindingState,
        noticeDeliveryStatus: result.noticeDeliveryStatus,
      };
      return result;
    }),

    getStatus: jest.fn(async (_credentials: ParentalConsentCredentials) => {
      getStatusCalls += 1;
      if (getStatusDelay) {
        await getStatusDelay();
      }
      if (getStatusError) {
        throw getStatusError;
      }
      const result: ParentalConsentStatusResult = { ...snapshot };
      return result;
    }),

    resendNotice: jest.fn(async () => {
      if (getStatusError) {
        throw getStatusError;
      }
      const result: ResendParentalConsentNoticeResult = {
        noticeDeliveryStatus: 'sent',
      };
      snapshot = { ...snapshot, noticeDeliveryStatus: result.noticeDeliveryStatus };
      return result;
    }),

    updateParentEmail: jest.fn(async (credentials) => {
      if (getStatusError) {
        throw getStatusError;
      }
      const result: UpdateParentalConsentEmailResult = {
        maskedParentEmail: mask(credentials.parentEmail),
        noticeDeliveryStatus: 'sent',
      };
      snapshot = {
        ...snapshot,
        maskedParentEmail: result.maskedParentEmail,
        noticeDeliveryStatus: result.noticeDeliveryStatus,
        status: 'pending',
        bindingState: 'unbound',
      };
      return result;
    }),

    claim: jest.fn(async () => {
      if (claimError) {
        throw claimError;
      }
      if (claimResult) {
        return claimResult;
      }
      const result: ClaimParentalConsentResult = {
        status: 'approved',
        bindingState: 'bound',
        claimedByUid: 'user-1',
      };
      snapshot = { ...snapshot, status: 'approved', bindingState: 'bound' };
      return result;
    }),
  };
}

function mask(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf('@');
  if (at <= 0) {
    return '***';
  }
  return `${trimmed[0]}***${trimmed.slice(at)}`;
}
