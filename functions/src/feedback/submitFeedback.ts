import { getFirestore, Timestamp } from 'firebase-admin/firestore';

import type { IgniteEnvironmentName } from '../config/environment';
import {
  FEEDBACK_APP_VERSION_MAX_LENGTH,
  FEEDBACK_COLLECTION,
  FEEDBACK_MESSAGE_MAX_LENGTH,
  FEEDBACK_MESSAGE_MIN_LENGTH,
  FEEDBACK_OS_VERSION_MAX_LENGTH,
  FEEDBACK_TITLE_MAX_LENGTH,
  isFeedbackCategory,
  isFeedbackDeviceType,
  isFeedbackPlatform,
  type FeedbackCategory,
  type FeedbackDeviceType,
  type FeedbackPlatform,
} from './feedbackPolicy';
import { FeedbackError } from './feedbackHttpsError';

export interface FeedbackSubmissionWrite {
  category: FeedbackCategory;
  title: string | null;
  message: string;
  appVersion: string;
  platform: FeedbackPlatform;
  osVersion: string;
  deviceType: FeedbackDeviceType;
  createdAt: Timestamp;
  environment: IgniteEnvironmentName;
}

export interface FeedbackRepositoryPort {
  add(document: FeedbackSubmissionWrite): Promise<{ submissionId: string }>;
}

export interface FeedbackServiceDeps {
  repository: FeedbackRepositoryPort;
  environment: IgniteEnvironmentName;
  now?: () => Date;
}

export interface SubmitFeedbackResult {
  submissionId: string;
}

function requireBoundedString(
  value: unknown,
  fieldName: string,
  maxLength: number,
): string {
  if (typeof value !== 'string') {
    throw new FeedbackError('invalid_argument', `${fieldName} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    throw new FeedbackError('invalid_argument', `${fieldName} is invalid.`);
  }
  return trimmed;
}

function optionalTitle(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new FeedbackError('invalid_argument', 'title is invalid.');
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > FEEDBACK_TITLE_MAX_LENGTH) {
    throw new FeedbackError('invalid_argument', 'title is invalid.');
  }
  return trimmed;
}

function requireMessage(value: unknown): string {
  if (typeof value !== 'string') {
    throw new FeedbackError('invalid_argument', 'message is required.');
  }
  const trimmed = value.trim();
  if (
    trimmed.length < FEEDBACK_MESSAGE_MIN_LENGTH ||
    trimmed.length > FEEDBACK_MESSAGE_MAX_LENGTH
  ) {
    throw new FeedbackError('invalid_argument', 'message is invalid.');
  }
  return trimmed;
}

/**
 * Persists one feedback submission. request.auth.uid authorizes the callable
 * only and is never written. Client uid/actorUid/createdAt/environment are ignored.
 */
export async function submitFeedback(
  deps: FeedbackServiceDeps,
  data: Record<string, unknown> | null | undefined,
): Promise<SubmitFeedbackResult> {
  const payload = data ?? {};

  if (!isFeedbackCategory(payload.category)) {
    throw new FeedbackError('invalid_argument', 'category is invalid.');
  }

  const title = optionalTitle(payload.title);
  const message = requireMessage(payload.message);
  const appVersion = requireBoundedString(
    payload.appVersion,
    'appVersion',
    FEEDBACK_APP_VERSION_MAX_LENGTH,
  );
  if (!isFeedbackPlatform(payload.platform)) {
    throw new FeedbackError('invalid_argument', 'platform is invalid.');
  }
  const osVersion = requireBoundedString(
    payload.osVersion,
    'osVersion',
    FEEDBACK_OS_VERSION_MAX_LENGTH,
  );
  if (!isFeedbackDeviceType(payload.deviceType)) {
    throw new FeedbackError('invalid_argument', 'deviceType is invalid.');
  }

  const now = deps.now?.() ?? new Date();
  const document: FeedbackSubmissionWrite = {
    category: payload.category,
    title,
    message,
    appVersion,
    platform: payload.platform,
    osVersion,
    deviceType: payload.deviceType,
    createdAt: Timestamp.fromDate(now),
    environment: deps.environment,
  };

  return deps.repository.add(document);
}

export function createFirestoreFeedbackRepository(): FeedbackRepositoryPort {
  return {
    async add(document) {
      const ref = await getFirestore().collection(FEEDBACK_COLLECTION).add(document);
      return { submissionId: ref.id };
    },
  };
}
