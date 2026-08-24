import type { Firestore } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';

import { CONSENT_COLLECTION } from '../config/consentPolicy';
import type {
  AccountBinding,
  ParentalConsentMethod,
  ParentalConsentRequest,
  ParentalConsentStatus,
} from '../domain/parentalConsent';
import { ParentalConsentError } from '../domain/parentalConsent';

/** Firestore DTO — not the domain model. */
export interface ParentalConsentFirestoreDocument {
  status: ParentalConsentStatus;
  consentMethod: ParentalConsentMethod;
  noticeVersion: string;
  parentEmail: string;
  parentEmailHash: string;
  maskedParentEmail: string;
  clientSessionTokenHash: string;
  approvalTokenHash: string;
  confirmationTokenHash: string;
  revokeTokenHash: string;
  requestedAt: Timestamp;
  expiresAt: Timestamp;
  initialConsentAt?: Timestamp | null;
  confirmationSentAt?: Timestamp | null;
  confirmedAt?: Timestamp | null;
  revokedAt?: Timestamp | null;
  resendCount: number;
  lastResendAt?: Timestamp | null;
  claimedByUid?: string | null;
  claimedAt?: Timestamp | null;
  environment: string;
}

export interface ConsentTokensHashes {
  clientSessionTokenHash: string;
  approvalTokenHash: string;
  confirmationTokenHash: string;
  revokeTokenHash: string;
}

export interface CreateConsentDocumentInput {
  requestId: string;
  parentEmail: string;
  parentEmailHash: string;
  maskedParentEmail: string;
  noticeVersion: string;
  environment: string;
  requestedAt: Date;
  expiresAt: Date;
  tokens: ConsentTokensHashes;
}

/** Repository port used by consent use cases (Firestore or memory test double). */
export interface ParentalConsentRepositoryPort {
  create(input: CreateConsentDocumentInput): Promise<void>;
  getRaw(
    requestId: string,
  ): Promise<(ParentalConsentFirestoreDocument & { requestId: string }) | null>;
  requireRaw(
    requestId: string,
  ): Promise<ParentalConsentFirestoreDocument & { requestId: string }>;
  toDomain(
    doc: ParentalConsentFirestoreDocument & { requestId: string },
  ): ParentalConsentRequest;
  updateFields(
    requestId: string,
    fields: Partial<ParentalConsentFirestoreDocument>,
  ): Promise<void>;
  findByTokenHash(
    field:
      | 'approvalTokenHash'
      | 'confirmationTokenHash'
      | 'revokeTokenHash'
      | 'clientSessionTokenHash',
    tokenHash: string,
  ): Promise<(ParentalConsentFirestoreDocument & { requestId: string }) | null>;
  runTransaction<T>(
    requestId: string,
    worker: (
      doc: ParentalConsentFirestoreDocument & { requestId: string },
    ) => {
      update: Partial<ParentalConsentFirestoreDocument>;
      result: T;
    },
  ): Promise<T>;
}

export class ConsentRepository implements ParentalConsentRepositoryPort {
  constructor(private readonly db: Firestore) {}

  private docRef(requestId: string) {
    return this.db.collection(CONSENT_COLLECTION).doc(requestId);
  }

  async create(input: CreateConsentDocumentInput): Promise<void> {
    const doc: ParentalConsentFirestoreDocument = {
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
    };
    await this.docRef(input.requestId).create(doc);
  }

  async getRaw(
    requestId: string,
  ): Promise<(ParentalConsentFirestoreDocument & { requestId: string }) | null> {
    const snap = await this.docRef(requestId).get();
    if (!snap.exists) {
      return null;
    }
    return {
      requestId,
      ...(snap.data() as ParentalConsentFirestoreDocument),
    };
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
    const accountBinding: AccountBinding = doc.claimedByUid
      ? {
          state: 'bound',
          claimedByUid: doc.claimedByUid,
          claimedAt: doc.claimedAt?.toDate() ?? new Date(0),
        }
      : { state: 'unbound' };

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
      accountBinding,
    };
  }

  async updateFields(
    requestId: string,
    fields: Partial<ParentalConsentFirestoreDocument>,
  ): Promise<void> {
    await this.docRef(requestId).update(fields);
  }

  async findByTokenHash(
    field:
      | 'approvalTokenHash'
      | 'confirmationTokenHash'
      | 'revokeTokenHash'
      | 'clientSessionTokenHash',
    tokenHash: string,
  ): Promise<(ParentalConsentFirestoreDocument & { requestId: string }) | null> {
    const query = await this.db
      .collection(CONSENT_COLLECTION)
      .where(field, '==', tokenHash)
      .limit(1)
      .get();
    if (query.empty) {
      return null;
    }
    const snap = query.docs[0];
    return {
      requestId: snap.id,
      ...(snap.data() as ParentalConsentFirestoreDocument),
    };
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
    return this.db.runTransaction(async (tx) => {
      const ref = this.docRef(requestId);
      const snap = await tx.get(ref);
      if (!snap.exists) {
        throw new ParentalConsentError('not_found', 'Consent request not found.');
      }
      const current = {
        requestId,
        ...(snap.data() as ParentalConsentFirestoreDocument),
      };
      const { update, result } = worker(current);
      if (Object.keys(update).length > 0) {
        tx.update(ref, update);
      }
      return result;
    });
  }
}
