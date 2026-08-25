export type NoticeDeliveryStatus =
  | 'pending'
  | 'sent'
  | 'failed_transient'
  | 'failed_permanent';

export type ConfirmationDeliveryStatus =
  | 'pending'
  | 'scheduled'
  | 'sent'
  | 'failed_transient'
  | 'failed_permanent';

export interface ParentalConsentActionUrls {
  approve?: string;
  confirm?: string;
  revoke?: string;
}

export interface ParentalConsentNoticeParams {
  requestId: string;
  toEmail: string;
  maskedParentEmail: string;
  idempotencyKey: string;
  actionUrls: ParentalConsentActionUrls;
  noticeVersion: string;
  expiresAt: Date;
  /** Present only for test capture / template URL construction — never log. */
  approvalToken?: string;
  revokeToken?: string;
}

export interface ParentalConsentConfirmationParams {
  requestId: string;
  toEmail: string;
  maskedParentEmail: string;
  idempotencyKey: string;
  actionUrls: ParentalConsentActionUrls;
  noticeVersion: string;
  expiresAt: Date;
  confirmationToken?: string;
  revokeToken?: string;
}

export interface EmailSender {
  sendParentalConsentNotice(params: ParentalConsentNoticeParams): Promise<void>;
  sendParentalConsentConfirmation(
    params: ParentalConsentConfirmationParams,
  ): Promise<void>;
}
