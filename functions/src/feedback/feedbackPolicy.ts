/**
 * Named feedback policy constants (server-owned).
 * Auth-only abuse control in Phase 8 — no per-UID rate limit yet.
 */

export const FEEDBACK_COLLECTION = 'feedbackSubmissions';

export const FEEDBACK_CATEGORIES = ['bug', 'feature', 'general'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_PLATFORMS = ['ios', 'android', 'web', 'unknown'] as const;
export type FeedbackPlatform = (typeof FEEDBACK_PLATFORMS)[number];

export const FEEDBACK_DEVICE_TYPES = ['mobile', 'tablet', 'web', 'unknown'] as const;
export type FeedbackDeviceType = (typeof FEEDBACK_DEVICE_TYPES)[number];

/** Optional scan-friendly subject. */
export const FEEDBACK_TITLE_MAX_LENGTH = 80;

/** Useful bug detail without document dumps. */
export const FEEDBACK_MESSAGE_MAX_LENGTH = 2000;

export const FEEDBACK_MESSAGE_MIN_LENGTH = 1;

export const FEEDBACK_APP_VERSION_MAX_LENGTH = 32;
export const FEEDBACK_OS_VERSION_MAX_LENGTH = 64;

export function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return (
    typeof value === 'string' &&
    (FEEDBACK_CATEGORIES as readonly string[]).includes(value)
  );
}

export function isFeedbackPlatform(value: unknown): value is FeedbackPlatform {
  return (
    typeof value === 'string' &&
    (FEEDBACK_PLATFORMS as readonly string[]).includes(value)
  );
}

export function isFeedbackDeviceType(value: unknown): value is FeedbackDeviceType {
  return (
    typeof value === 'string' &&
    (FEEDBACK_DEVICE_TYPES as readonly string[]).includes(value)
  );
}
