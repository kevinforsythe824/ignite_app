export interface ParentalConsentNoticeParams {
  requestId: string;
  maskedParentEmail: string;
  /** Present only for test capture — never passed to production loggers. */
  approvalToken?: string;
  revokeToken?: string;
}

export interface ParentalConsentConfirmationParams {
  requestId: string;
  maskedParentEmail: string;
  confirmationToken?: string;
  revokeToken?: string;
}

export interface EmailSender {
  sendParentalConsentNotice(params: ParentalConsentNoticeParams): Promise<void>;
  sendParentalConsentConfirmation(
    params: ParentalConsentConfirmationParams,
  ): Promise<void>;
}
