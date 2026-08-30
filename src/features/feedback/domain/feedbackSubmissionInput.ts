import type { FeedbackCategory } from './feedbackCategory';

export const FEEDBACK_PLATFORMS = ['ios', 'android', 'web', 'unknown'] as const;
export const FEEDBACK_DEVICE_TYPES = ['mobile', 'tablet', 'web', 'unknown'] as const;

export type FeedbackPlatform = (typeof FEEDBACK_PLATFORMS)[number];
export type FeedbackDeviceType = (typeof FEEDBACK_DEVICE_TYPES)[number];

/** Safe client technical metadata. Never includes UID, profile, or consent. */
export interface SafeClientMetadata {
  appVersion: string;
  platform: FeedbackPlatform;
  osVersion: string;
  deviceType: FeedbackDeviceType;
}

/** Application-facing submit payload after local validation + metadata attach. */
export interface FeedbackSubmissionInput {
  category: FeedbackCategory;
  title: string | null;
  message: string;
  metadata: SafeClientMetadata;
}

export interface SubmitFeedbackResult {
  submissionId: string;
}
