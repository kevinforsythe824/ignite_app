import type {
  NoticeDeliveryStatus,
  ParentalConsentBindingState,
} from './parentalConsentStatus';

/** Authoritative last-known status from getParentalConsentStatus (or create/resend). */
export interface ParentalConsentSnapshot {
  status: string;
  maskedParentEmail: string;
  expiresAt: string;
  bindingState: ParentalConsentBindingState;
  /** Present only when the last create/resend/update returned it. */
  noticeDeliveryStatus?: NoticeDeliveryStatus;
}
