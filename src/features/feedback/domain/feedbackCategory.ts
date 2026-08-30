export const FEEDBACK_CATEGORIES = ['bug', 'feature', 'general'] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return (
    typeof value === 'string' &&
    (FEEDBACK_CATEGORIES as readonly string[]).includes(value)
  );
}
