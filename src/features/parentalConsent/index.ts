export { parentalConsentCopy } from './copy/parentalConsentCopy';
export {
  CONSENT_CLIENT_SESSION_VERSION,
  createEmptyConsentClientSession,
  hasConsentCapability,
} from './domain/consentClientSession';
export type { ConsentClientSession } from './domain/consentClientSession';
export type { ParentalConsentSnapshot } from './domain/parentalConsentSnapshot';
export {
  isWaitingConsentStatus,
  toParentalConsentPresentation,
} from './domain/parentalConsentStatus';
export type {
  NoticeDeliveryStatus,
  ParentalConsentBindingState,
  ParentalConsentLifecycleStatus,
  ParentalConsentPresentation,
} from './domain/parentalConsentStatus';
export { ParentalConsentError } from './errors/parentalConsentError';
export type { ParentalConsentErrorCode } from './errors/parentalConsentError';
export {
  isTerminalClaimError,
  isTransientParentalConsentError,
  translateParentalConsentError,
} from './errors/translateParentalConsentError';
export { useParentalConsent } from './hooks/useParentalConsent';
export type {
  ConsentResumeDestination,
  ParentalConsentContextValue,
} from './hooks/useParentalConsent';
export {
  FirebaseParentalConsentRepository,
  createFirebaseParentalConsentSource,
  firebaseParentalConsentRepository,
} from './repositories';
export type { ParentalConsentRepository } from './repositories';
export { ConsentClaimPendingScreen } from './screens/ConsentClaimPendingScreen';
export { ConsentChangeEmailScreen } from './screens/ConsentChangeEmailScreen';
export { ConsentPendingScreen } from './screens/ConsentPendingScreen';
export { ConsentRecoveryScreen } from './screens/ConsentRecoveryScreen';
export { ParentConsentIntroScreen } from './screens/ParentConsentIntroScreen';
export { ParentEmailScreen } from './screens/ParentEmailScreen';
export type { ConsentSecureStore } from './storage/consentSecureStore';
export {
  CONSENT_SECURE_STORE_KEY,
  createExpoConsentSecureStore,
  expoConsentSecureStore,
} from './storage/expoConsentSecureStore';
export { ParentalConsentProvider } from './state/ParentalConsentProvider';
export type { ParentalConsentProviderProps } from './state/ParentalConsentProvider';
export type { ParentalConsentSessionState } from './state/parentalConsentSessionState';
export { validateParentEmail } from './validation/parentEmailValidation';
