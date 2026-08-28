import { httpsCallable } from 'firebase/functions';

import { getFirebaseAuth } from '../../../services/firebase/firebaseAuth';
import { getFirebaseFunctions } from '../../../services/firebase/firebaseFunctions';
import type {
  ClaimParentalConsentResult,
  CreateParentalConsentRequestResult,
  ParentalConsentCredentials,
  ParentalConsentStatusResult,
  ResendParentalConsentNoticeResult,
  UpdateParentalConsentEmailResult,
} from './parentalConsentRepository';

/** Smallest Firebase Functions port for parental consent callables. */
export interface ParentalConsentFirebaseSource {
  createRequest(parentEmail: string): Promise<CreateParentalConsentRequestResult>;
  getStatus(
    credentials: ParentalConsentCredentials,
  ): Promise<ParentalConsentStatusResult>;
  resendNotice(
    credentials: ParentalConsentCredentials,
  ): Promise<ResendParentalConsentNoticeResult>;
  updateParentEmail(
    credentials: ParentalConsentCredentials & { parentEmail: string },
  ): Promise<UpdateParentalConsentEmailResult>;
  claim(credentials: ParentalConsentCredentials): Promise<ClaimParentalConsentResult>;
}

export function createFirebaseParentalConsentSource(
  getFunctionsInstance: typeof getFirebaseFunctions = getFirebaseFunctions,
  getAuthInstance: typeof getFirebaseAuth = getFirebaseAuth,
): ParentalConsentFirebaseSource {
  return {
    async createRequest(parentEmail: string) {
      const callable = httpsCallable(getFunctionsInstance(), 'createParentalConsentRequest');
      const result = await callable({ parentEmail });
      return result.data as CreateParentalConsentRequestResult;
    },

    async getStatus(credentials) {
      const callable = httpsCallable(getFunctionsInstance(), 'getParentalConsentStatus');
      const result = await callable({
        requestId: credentials.requestId,
        clientSessionToken: credentials.clientSessionToken,
      });
      return result.data as ParentalConsentStatusResult;
    },

    async resendNotice(credentials) {
      const callable = httpsCallable(getFunctionsInstance(), 'resendParentalConsentNotice');
      const result = await callable({
        requestId: credentials.requestId,
        clientSessionToken: credentials.clientSessionToken,
      });
      return result.data as ResendParentalConsentNoticeResult;
    },

    async updateParentEmail(credentials) {
      const callable = httpsCallable(getFunctionsInstance(), 'updateParentalConsentEmail');
      const result = await callable({
        requestId: credentials.requestId,
        clientSessionToken: credentials.clientSessionToken,
        parentEmail: credentials.parentEmail,
      });
      return result.data as UpdateParentalConsentEmailResult;
    },

    async claim(credentials) {
      // Claim requires Functions auth context. Wait for a concrete ID token before
      // calling — never invoke while Auth currentUser is missing after signup.
      const auth = getAuthInstance();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        const error = new Error('Authentication is required to claim parental consent.');
        (error as { code?: string }).code = 'unauthenticated';
        throw error;
      }
      await currentUser.getIdToken(/* forceRefresh */ true);
      const callable = httpsCallable(getFunctionsInstance(), 'claimParentalConsent');
      const result = await callable({
        requestId: credentials.requestId,
        clientSessionToken: credentials.clientSessionToken,
      });
      return result.data as ClaimParentalConsentResult;
    },
  };
}
