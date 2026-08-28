import { translateParentalConsentError } from '../errors/translateParentalConsentError';
import type {
  ClaimParentalConsentResult,
  CreateParentalConsentRequestInput,
  CreateParentalConsentRequestResult,
  ParentalConsentCredentials,
  ParentalConsentRepository,
  ParentalConsentStatusResult,
  ResendParentalConsentNoticeResult,
  UpdateParentalConsentEmailResult,
} from './parentalConsentRepository';
import {
  createFirebaseParentalConsentSource,
  type ParentalConsentFirebaseSource,
} from './firebaseParentalConsentSource';

/** Firebase-backed ParentalConsentRepository used by the application layer. */
export class FirebaseParentalConsentRepository implements ParentalConsentRepository {
  constructor(private readonly source: ParentalConsentFirebaseSource) {}

  async createRequest(
    input: CreateParentalConsentRequestInput,
  ): Promise<CreateParentalConsentRequestResult> {
    try {
      return await this.source.createRequest(input.parentEmail.trim());
    } catch (error: unknown) {
      throw translateParentalConsentError(error);
    }
  }

  async getStatus(
    credentials: ParentalConsentCredentials,
  ): Promise<ParentalConsentStatusResult> {
    try {
      return await this.source.getStatus(credentials);
    } catch (error: unknown) {
      throw translateParentalConsentError(error);
    }
  }

  async resendNotice(
    credentials: ParentalConsentCredentials,
  ): Promise<ResendParentalConsentNoticeResult> {
    try {
      return await this.source.resendNotice(credentials);
    } catch (error: unknown) {
      throw translateParentalConsentError(error);
    }
  }

  async updateParentEmail(
    credentials: ParentalConsentCredentials & { parentEmail: string },
  ): Promise<UpdateParentalConsentEmailResult> {
    try {
      return await this.source.updateParentEmail({
        ...credentials,
        parentEmail: credentials.parentEmail.trim(),
      });
    } catch (error: unknown) {
      throw translateParentalConsentError(error);
    }
  }

  async claim(credentials: ParentalConsentCredentials): Promise<ClaimParentalConsentResult> {
    try {
      return await this.source.claim(credentials);
    } catch (error: unknown) {
      throw translateParentalConsentError(error);
    }
  }
}

export const firebaseParentalConsentRepository = new FirebaseParentalConsentRepository(
  createFirebaseParentalConsentSource(),
);
