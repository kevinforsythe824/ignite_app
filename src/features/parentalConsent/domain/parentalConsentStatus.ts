/** Server lifecycle statuses for a parental consent request. */
export type ParentalConsentLifecycleStatus =
  | 'pending'
  | 'initial_consent_received'
  | 'approved'
  | 'expired'
  | 'revoked';

/** Whether an approved request is already bound to a Firebase Auth UID. */
export type ParentalConsentBindingState = 'unbound' | 'bound';

/** Delivery outcome for the last create / resend / update-email notice. */
export type NoticeDeliveryStatus =
  | 'pending'
  | 'sent'
  | 'failed_transient'
  | 'failed_permanent';

/**
 * Client presentation bucket derived from authoritative getStatus.
 * Do not invent a local approved flag.
 */
export type ParentalConsentPresentation =
  | 'waiting'
  | 'approvedUnbound'
  | 'approvedBound'
  | 'recovery';

const WAITING_STATUSES: ReadonlySet<string> = new Set([
  'pending',
  'initial_consent_received',
]);

/** Maps server status + binding into a presentation bucket for navigation. */
export function toParentalConsentPresentation(
  status: string,
  bindingState: ParentalConsentBindingState,
): ParentalConsentPresentation {
  if (WAITING_STATUSES.has(status)) {
    return 'waiting';
  }
  if (status === 'approved' && bindingState === 'unbound') {
    return 'approvedUnbound';
  }
  if (status === 'approved' && bindingState === 'bound') {
    return 'approvedBound';
  }
  return 'recovery';
}

export function isWaitingConsentStatus(status: string): boolean {
  return WAITING_STATUSES.has(status);
}
