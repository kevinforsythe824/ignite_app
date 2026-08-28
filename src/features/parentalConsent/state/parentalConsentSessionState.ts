import type { ConsentClientSession } from '../domain/consentClientSession';
import type { ParentalConsentSnapshot } from '../domain/parentalConsentSnapshot';
import type { ParentalConsentError } from '../errors/parentalConsentError';

export type ParentalConsentHydrateStatus = 'idle' | 'hydrating' | 'ready';

/**
 * In-memory parental consent session owned by ParentalConsentProvider.
 * Capability is the SecureStore blob; snapshot is last authoritative getStatus.
 */
export interface ParentalConsentSessionState {
  hydrateStatus: ParentalConsentHydrateStatus;
  capability: ConsentClientSession | null;
  snapshot: ParentalConsentSnapshot | null;
  lastError: ParentalConsentError | null;
  /** True while a status refresh / mutating callable is in flight. */
  refreshing: boolean;
}

export const initialParentalConsentSessionState: ParentalConsentSessionState = {
  hydrateStatus: 'idle',
  capability: null,
  snapshot: null,
  lastError: null,
  refreshing: false,
};
