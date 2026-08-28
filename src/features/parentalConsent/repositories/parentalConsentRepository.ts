import type { ParentalConsentSnapshot } from '../domain/parentalConsentSnapshot';
import type { NoticeDeliveryStatus } from '../domain/parentalConsentStatus';

export interface CreateParentalConsentRequestInput {
  parentEmail: string;
}

export interface CreateParentalConsentRequestResult extends ParentalConsentSnapshot {
  requestId: string;
  clientSessionToken: string;
  noticeDeliveryStatus: NoticeDeliveryStatus;
}

export interface ParentalConsentStatusResult extends ParentalConsentSnapshot {}

export interface ResendParentalConsentNoticeResult {
  noticeDeliveryStatus: NoticeDeliveryStatus;
}

export interface UpdateParentalConsentEmailResult {
  maskedParentEmail: string;
  noticeDeliveryStatus: NoticeDeliveryStatus;
}

export interface ClaimParentalConsentResult {
  status: string;
  bindingState: 'bound';
  claimedByUid: string;
}

export interface ParentalConsentCredentials {
  requestId: string;
  clientSessionToken: string;
}

/**
 * Application-facing parental consent repository.
 * Callables only — never Hosting HTTP or Firestore consent docs.
 */
export interface ParentalConsentRepository {
  createRequest(
    input: CreateParentalConsentRequestInput,
  ): Promise<CreateParentalConsentRequestResult>;
  getStatus(credentials: ParentalConsentCredentials): Promise<ParentalConsentStatusResult>;
  resendNotice(
    credentials: ParentalConsentCredentials,
  ): Promise<ResendParentalConsentNoticeResult>;
  updateParentEmail(
    credentials: ParentalConsentCredentials & { parentEmail: string },
  ): Promise<UpdateParentalConsentEmailResult>;
  /**
   * Claims approved consent for the currently authenticated Firebase user.
   * Payload is only requestId + clientSessionToken — never a client UID.
   */
  claim(credentials: ParentalConsentCredentials): Promise<ClaimParentalConsentResult>;
}
