import { Platform } from 'react-native';

import { getAppVersion } from '../../../shared/utils/getAppVersion';
import type {
  FeedbackDeviceType,
  FeedbackPlatform,
  SafeClientMetadata,
} from '../domain/feedbackSubmissionInput';

export interface ClientPlatformInfo {
  OS: string;
  Version: string | number;
  isPad?: boolean;
}

function resolvePlatform(os: string): FeedbackPlatform {
  if (os === 'ios' || os === 'android' || os === 'web') {
    return os;
  }
  return 'unknown';
}

/**
 * Coarse device class only. `tablet` is set only when the runtime exposes it
 * (iOS `Platform.isPad`). Android is `mobile` — never guessed as phone or tablet.
 */
function resolveDeviceType(platformInfo: ClientPlatformInfo): FeedbackDeviceType {
  if (platformInfo.OS === 'web') {
    return 'web';
  }
  if (platformInfo.OS === 'ios' && platformInfo.isPad === true) {
    return 'tablet';
  }
  if (platformInfo.OS === 'ios' || platformInfo.OS === 'android') {
    return 'mobile';
  }
  return 'unknown';
}

/**
 * Safe technical metadata for feedback. Does not read Auth, QuizzerProfile,
 * parental consent, or any UID / email / name.
 */
export function collectSafeClientMetadata(
  getVersion: () => string = getAppVersion,
  platformInfo: ClientPlatformInfo = Platform,
): SafeClientMetadata {
  return {
    appVersion: getVersion(),
    platform: resolvePlatform(platformInfo.OS),
    osVersion: String(platformInfo.Version),
    deviceType: resolveDeviceType(platformInfo),
  };
}
