import { HttpsError } from 'firebase-functions/v2/https';

import { ParentalConsentError } from '../domain/parentalConsent';

export function toHttpsError(error: unknown): HttpsError {
  if (error instanceof HttpsError) {
    return error;
  }
  if (error instanceof ParentalConsentError) {
    switch (error.code) {
      case 'invalid_argument':
        return new HttpsError('invalid-argument', error.message);
      case 'unauthenticated':
        return new HttpsError('unauthenticated', error.message);
      case 'not_found':
        return new HttpsError('not-found', error.message);
      case 'permission_denied':
        return new HttpsError('permission-denied', error.message);
      case 'failed_precondition':
      case 'expired':
      case 'revoked':
        return new HttpsError('failed-precondition', error.message);
      case 'resource_exhausted':
        return new HttpsError('resource-exhausted', error.message);
      case 'already_bound':
        return new HttpsError('already-exists', error.message);
      case 'invalid_token':
        return new HttpsError('permission-denied', error.message);
      default:
        return new HttpsError('internal', 'Unable to complete consent operation.');
    }
  }
  return new HttpsError('internal', 'Unable to complete consent operation.');
}

export function clientIpFromRawRequest(
  rawRequest: { ip?: string; headers?: Record<string, string | string[] | undefined> } | undefined,
): string | undefined {
  if (!rawRequest) {
    return undefined;
  }
  const forwarded = rawRequest.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0]?.trim();
  }
  return rawRequest.ip;
}
