import { Timestamp } from 'firebase-admin/firestore';

import type {
  ConsentTokensHashes,
  CreateConsentDocumentInput,
  ParentalConsentFirestoreDocument,
  ParentalConsentRepositoryPort,
} from './repository';
import { ParentalConsentError } from '../domain/parentalConsent';
import type { ParentalConsentRequest } from '../domain/parentalConsent';

/**
 * In-memory consent store for unit tests (not production).
 * Mimics ConsentRepository transaction semantics without Firestore.
 */
export class MemoryConsentRepository implements ParentalConsentRepositoryPort {
  private readonly docs = new Map<
    string,
    ParentalConsentFirestoreDocument & { requestId: string }
  >();

  async create(input: CreateConsentDocumentInput): Promise<void> {
    if (this.docs.has(input.requestId)) {
      throw new ParentalConsentError('failed_precondition', 'Request exists.');
    }
    this.docs.set(input.requestId, {
      requestId: input.requestId,
      status: 'pending',
      consentMethod: 'email_plus',
      noticeVersion: input.noticeVersion,
      parentEmail: input.parentEmail,
      parentEmailHash: input.parentEmailHash,
      maskedParentEmail: input.maskedParentEmail,
      clientSessionTokenHash: input.tokens.clientSessionTokenHash,
      approvalTokenHash: input.tokens.approvalTokenHash,
      confirmationTokenHash: input.tokens.confirmationTokenHash,
      revokeTokenHash: input.tokens.revokeTokenHash,
      requestedAt: Timestamp.fromDate(input.requestedAt),
      expiresAt: Timestamp.fromDate(input.expiresAt),
      initialConsentAt: null,
      confirmationSentAt: null,
      confirmedAt: null,
      revokedAt: null,
      resendCount: 0,
      lastResendAt: null,
      claimedByUid: null,
      claimedAt: null,
      environment: input.environment,
    });
  }

  async getRaw(
    requestId: string,
  ): Promise<(ParentalConsentFirestoreDocument & { requestId: string }) | null> {
    const doc = this.docs.get(requestId);
    return doc ? { ...doc } : null;
  }

  async requireRaw(
    requestId: string,
  ): Promise<ParentalConsentFirestoreDocument & { requestId: string }> {
    const doc = await this.getRaw(requestId);
    if (!doc) {
      throw new ParentalConsentError('not_found', 'Consent request not found.');
    }
    return doc;
  }

  toDomain(
    doc: ParentalConsentFirestoreDocument & { requestId: string },
  ): ParentalConsentRequest {
    return {
      requestId: doc.requestId,
      status: doc.status,
      consentMethod: doc.consentMethod,
      noticeVersion: doc.noticeVersion,
      maskedParentEmail: doc.maskedParentEmail,
      requestedAt: doc.requestedAt.toDate(),
      expiresAt: doc.expiresAt.toDate(),
      initialConsentAt: doc.initialConsentAt?.toDate(),
      confirmationSentAt: doc.confirmationSentAt?.toDate(),
      confirmedAt: doc.confirmedAt?.toDate(),
      revokedAt: doc.revokedAt?.toDate(),
      accountBinding: doc.claimedByUid
        ? {
            state: 'bound',
            claimedByUid: doc.claimedByUid,
            claimedAt: doc.claimedAt?.toDate() ?? new Date(0),
          }
        : { state: 'unbound' },
    };
  }

  async updateFields(
    requestId: string,
    fields: Partial<ParentalConsentFirestoreDocument>,
  ): Promise<void> {
    const current = await this.requireRaw(requestId);
    this.docs.set(requestId, { ...current, ...fields, requestId });
  }

  async findByTokenHash(
    field:
      | 'approvalTokenHash'
      | 'confirmationTokenHash'
      | 'revokeTokenHash'
      | 'clientSessionTokenHash',
    tokenHash: string,
  ): Promise<(ParentalConsentFirestoreDocument & { requestId: string }) | null> {
    for (const doc of this.docs.values()) {
      if (doc[field] === tokenHash) {
        return { ...doc };
      }
    }
    return null;
  }

  async runTransaction<T>(
    requestId: string,
    worker: (
      doc: ParentalConsentFirestoreDocument & { requestId: string },
    ) => {
      update: Partial<ParentalConsentFirestoreDocument>;
      result: T;
    },
  ): Promise<T> {
    const current = await this.requireRaw(requestId);
    const { update, result } = worker(current);
    if (Object.keys(update).length > 0) {
      await this.updateFields(requestId, update);
    }
    return result;
  }

  /** Test helper */
  peek(requestId: string) {
    return this.docs.get(requestId);
  }

  /** Unused — satisfies structural typing with ConsentTokensHashes imports. */
  static _tokensType?: ConsentTokensHashes;
}
