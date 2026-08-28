export type { ParentalConsentRepository } from './parentalConsentRepository';
export type {
  ClaimParentalConsentResult,
  CreateParentalConsentRequestInput,
  CreateParentalConsentRequestResult,
  ParentalConsentCredentials,
  ParentalConsentStatusResult,
  ResendParentalConsentNoticeResult,
  UpdateParentalConsentEmailResult,
} from './parentalConsentRepository';
export {
  FirebaseParentalConsentRepository,
  firebaseParentalConsentRepository,
} from './firebaseParentalConsentRepository';
export {
  createFirebaseParentalConsentSource,
  type ParentalConsentFirebaseSource,
} from './firebaseParentalConsentSource';
