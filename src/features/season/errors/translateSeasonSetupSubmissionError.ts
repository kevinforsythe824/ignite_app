import {
  SeasonSetupSubmissionError,
  type SeasonSetupSubmissionErrorCode,
} from './seasonSetupSubmissionError';

function callableErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  const code = (error as { code: unknown }).code;
  if (typeof code !== 'string') {
    return undefined;
  }
  return code.replace(/^functions\//, '');
}

function codeForCallable(code: string): SeasonSetupSubmissionErrorCode {
  switch (code) {
    case 'unauthenticated':
      return 'unauthenticated';
    case 'invalid-argument':
      return 'invalid-request';
    case 'failed-precondition':
      return 'configuration-unavailable';
    case 'unavailable':
    case 'deadline-exceeded':
      return 'unavailable';
    default:
      return 'unexpected';
  }
}

/** Translates callable failures. Never returns. Does not forward raw server text. */
export function translateSeasonSetupSubmissionError(error: unknown): never {
  if (error instanceof SeasonSetupSubmissionError) {
    throw error;
  }

  const code = callableErrorCode(error);
  if (code === undefined) {
    throw new SeasonSetupSubmissionError('unexpected');
  }
  throw new SeasonSetupSubmissionError(codeForCallable(code));
}
