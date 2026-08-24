/**
 * Named parental-consent policy constants (server-owned).
 * Exact production VPC / legal interpretation remains subject to release review.
 * Do not claim COPPA compliance here.
 */

export const CONSENT_METHOD = 'email_plus' as const;

/** Notice copy version recorded on each request. */
export const NOTICE_VERSION = '2026-08-1';

/** Whether email-plus confirmation is required before status becomes approved. */
export const REQUIRE_CONFIRMATION_FOR_APPROVAL = true;

/**
 * Delay before confirmation email would be sent (6.5B delivery).
 * 6.5A records policy only; console sender may invoke confirmation immediately in tests.
 */
export const CONFIRMATION_EMAIL_DELAY_MS = 15 * 60 * 1000;

/** How long a consent request remains usable before check-on-access expiry. */
export const REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Minimum time between resend notices for one request. */
export const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

/** Max resends per request within its lifetime. */
export const MAX_RESENDS_PER_REQUEST = 5;

/** Sliding window for create/resend rate limits. */
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/** Max create attempts per parent-email HMAC hash per window. */
export const MAX_CREATES_PER_EMAIL_HASH = 5;

/** Max create attempts per IP per window. */
export const MAX_CREATES_PER_IP = 20;

/** Max resends per parent-email HMAC hash per window. */
export const MAX_RESENDS_PER_EMAIL_HASH = 10;

/** Max invalid-token attempts per IP per window. */
export const MAX_TOKEN_FAILURES_PER_IP = 30;

/** Opaque token entropy (bytes). */
export const TOKEN_BYTE_LENGTH = 32;

export const CONSENT_COLLECTION = 'parentalConsentRequests';
export const RATE_LIMIT_COLLECTION = 'parentalConsentRateLimits';
