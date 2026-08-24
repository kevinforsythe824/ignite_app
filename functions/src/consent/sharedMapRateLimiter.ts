import type { RateLimitAttempt, RateLimiter } from './rateLimiter';
import { ParentalConsentError } from '../domain/parentalConsent';
import { RATE_LIMIT_WINDOW_MS } from '../config/consentPolicy';

/**
 * Shared-store rate limiter for unit tests.
 * Two instances with the same Map prove cross-"instance" sharing
 * without relying on process-local Maps as the production design.
 */
export class SharedMapRateLimiter implements RateLimiter {
  constructor(
    private readonly store: Map<
      string,
      { count: number; windowStartedAt: number }
    >,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async consume(attempt: RateLimitAttempt): Promise<void> {
    const windowMs = attempt.windowMs ?? RATE_LIMIT_WINDOW_MS;
    const bucketId = `${attempt.kind}:${attempt.key}`;
    const nowMs = this.now().getTime();
    const existing = this.store.get(bucketId);
    let count = existing?.count ?? 0;
    let windowStartedAt = existing?.windowStartedAt ?? nowMs;
    if (nowMs - windowStartedAt >= windowMs) {
      count = 0;
      windowStartedAt = nowMs;
    }
    if (count >= attempt.limit) {
      throw new ParentalConsentError(
        'resource_exhausted',
        'Too many requests. Try again later.',
      );
    }
    this.store.set(bucketId, { count: count + 1, windowStartedAt });
  }
}
