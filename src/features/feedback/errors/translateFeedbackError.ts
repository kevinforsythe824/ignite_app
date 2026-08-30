import { feedbackCopy } from '../copy/feedbackCopy';
import { FeedbackError, type FeedbackErrorCode } from './feedbackError';

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

const CODE_MAP: Record<string, FeedbackErrorCode> = {
  'invalid-argument': 'invalid-argument',
  unauthenticated: 'unauthenticated',
  unavailable: 'unavailable',
  internal: 'unavailable',
  'deadline-exceeded': 'unavailable',
};

const MESSAGE_BY_CODE: Record<FeedbackErrorCode, string> = {
  'invalid-argument': feedbackCopy.errors.invalidArgument,
  unauthenticated: feedbackCopy.errors.unauthenticated,
  unavailable: feedbackCopy.errors.unavailable,
  'network-unavailable': feedbackCopy.errors.network,
  unexpected: feedbackCopy.errors.unexpected,
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
 * Maps Firebase Functions failures into Ignite feedback errors.
 * Uses stable Functions codes only — never parses server message bodies.
 */
export function translateFeedbackError(error: unknown): FeedbackError {
  if (error instanceof FeedbackError) {
    return error;
  }

  if (isNetworkLike(error)) {
    return new FeedbackError('network-unavailable', MESSAGE_BY_CODE['network-unavailable']);
  }

  const firebaseCode = firebaseFunctionsErrorCode(error);
  const mappedCode = firebaseCode ? CODE_MAP[firebaseCode] : undefined;
  const code: FeedbackErrorCode = mappedCode ?? 'unexpected';
  return new FeedbackError(code, MESSAGE_BY_CODE[code]);
}
