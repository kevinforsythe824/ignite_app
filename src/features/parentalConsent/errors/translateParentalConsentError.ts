import { parentalConsentCopy } from '../copy/parentalConsentCopy';
import {
  ParentalConsentError,
  type ParentalConsentErrorCode,
} from './parentalConsentError';

function firebaseFunctionsErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  const code = (error as { code: unknown }).code;
  if (typeof code !== 'string') {
    return undefined;
  }

  return code.replace(/^functions\//, '');
}

const CODE_MAP: Record<string, ParentalConsentErrorCode> = {
  'invalid-argument': 'invalid-argument',
  unauthenticated: 'unauthenticated',
  'permission-denied': 'permission-denied',
  'not-found': 'not-found',
  'already-exists': 'already-exists',
  'failed-precondition': 'failed-precondition',
  'resource-exhausted': 'resource-exhausted',
  unavailable: 'unavailable',
  internal: 'unavailable',
  'deadline-exceeded': 'unavailable',
};

const MESSAGE_BY_CODE: Record<ParentalConsentErrorCode, string> = {
  'invalid-argument': parentalConsentCopy.errors.invalidArgument,
  unauthenticated: parentalConsentCopy.errors.unauthenticated,
  'permission-denied': parentalConsentCopy.errors.permissionDenied,
  'not-found': parentalConsentCopy.errors.notFound,
  'already-exists': parentalConsentCopy.errors.alreadyExists,
  'failed-precondition': parentalConsentCopy.errors.failedPrecondition,
  'resource-exhausted': parentalConsentCopy.errors.resourceExhausted,
  unavailable: parentalConsentCopy.errors.unavailable,
  'network-unavailable': parentalConsentCopy.errors.network,
  unexpected: parentalConsentCopy.errors.unexpected,
};

function isNetworkLike(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const message =
    'message' in error && typeof (error as { message: unknown }).message === 'string'
      ? (error as { message: string }).message.toLowerCase()
      : '';
  return (
    message.includes('network') ||
    message.includes('offline') ||
    message.includes('failed to fetch')
  );
}

/**
 * Maps Firebase Functions failures into Ignite parental-consent errors.
 * Uses stable Functions codes only — never parses human-readable server messages
 * for security or navigation state.
 */
export function translateParentalConsentError(error: unknown): ParentalConsentError {
  if (error instanceof ParentalConsentError) {
    return error;
  }

  if (isNetworkLike(error)) {
    return new ParentalConsentError(
      'network-unavailable',
      MESSAGE_BY_CODE['network-unavailable'],
    );
  }

  const firebaseCode = firebaseFunctionsErrorCode(error);
  const mappedCode = firebaseCode ? CODE_MAP[firebaseCode] : undefined;
  const code: ParentalConsentErrorCode = mappedCode ?? 'unexpected';
  return new ParentalConsentError(code, MESSAGE_BY_CODE[code]);
}

/** True when the failure is likely transient and Retry is appropriate. */
export function isTransientParentalConsentError(error: ParentalConsentError): boolean {
  return error.code === 'unavailable' || error.code === 'network-unavailable';
}

/**
 * True when claim cannot succeed with the current request and fresh consent is required.
 * Prefer getStatus afterward for lifecycle; these codes alone are enough for terminal UX.
 */
export function isTerminalClaimError(error: ParentalConsentError): boolean {
  return (
    error.code === 'permission-denied' ||
    error.code === 'not-found' ||
    error.code === 'already-exists' ||
    error.code === 'failed-precondition'
  );
}
