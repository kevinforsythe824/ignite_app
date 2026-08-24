import type { Firestore } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';

import {
  RATE_LIMIT_COLLECTION,
  RATE_LIMIT_WINDOW_MS,
} from '../config/consentPolicy';
import { ParentalConsentError } from '../domain/parentalConsent';

export type RateLimitKind =
  | 'create:email'
  | 'create:ip'
  | 'resend:email'
  | 'tokenFail:ip';

export interface RateLimitAttempt {
  kind: RateLimitKind;
  key: string;
  limit: number;
  windowMs?: number;
}

export interface RateLimiter {
  consume(attempt: RateLimitAttempt): Promise<void>;
}

/**
 * Firestore-backed sliding-window counter.
 * Safe across Cloud Functions instances — no process memory.
 */
export class FirestoreRateLimiter implements RateLimiter {
  constructor(
    private readonly db: Firestore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async consume(attempt: RateLimitAttempt): Promise<void> {
    const windowMs = attempt.windowMs ?? RATE_LIMIT_WINDOW_MS;
    const bucketId = `${attempt.kind}:${sanitizeBucketKey(attempt.key)}`;
    const ref = this.db.collection(RATE_LIMIT_COLLECTION).doc(bucketId);
    const now = this.now();

    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? snap.data() : undefined;
      const windowStartedAt = toDate(data?.windowStartedAt) ?? now;
      const elapsed = now.getTime() - windowStartedAt.getTime();

      let count = typeof data?.count === 'number' ? data.count : 0;
      let nextWindowStart = windowStartedAt;

      if (elapsed >= windowMs) {
        count = 0;
        nextWindowStart = now;
      }

      if (count >= attempt.limit) {
        throw new ParentalConsentError(
          'resource_exhausted',
          'Too many requests. Try again later.',
        );
      }

      tx.set(
        ref,
        {
          kind: attempt.kind,
          count: count + 1,
          windowStartedAt: Timestamp.fromDate(nextWindowStart),
          updatedAt: Timestamp.fromDate(now),
        },
        { merge: true },
      );
    });
  }
}

function sanitizeBucketKey(key: string): string {
  return key.replace(/[/\\]/g, '_').slice(0, 700);
}

function toDate(value: unknown): Date | undefined {
  if (!value) {
    return undefined;
  }
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return undefined;
}

/** Test helper: read current count without mutating. */
export async function readRateLimitCount(
  db: Firestore,
  kind: RateLimitKind,
  key: string,
): Promise<number> {
  const bucketId = `${kind}:${sanitizeBucketKey(key)}`;
  const snap = await db.collection(RATE_LIMIT_COLLECTION).doc(bucketId).get();
  if (!snap.exists) {
    return 0;
  }
  const count = snap.data()?.count;
  return typeof count === 'number' ? count : 0;
}
