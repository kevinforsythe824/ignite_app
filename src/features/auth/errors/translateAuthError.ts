import { AuthenticationError, type AuthenticationErrorCode } from './authenticationError';

const INVALID_EMAIL_MESSAGE = 'Enter a valid email address.';
const INVALID_CREDENTIALS_MESSAGE = 'Email or password is incorrect.';
const EMAIL_IN_USE_MESSAGE = 'An account with this email already exists.';
const WEAK_PASSWORD_MESSAGE = 'Choose a stronger password.';
const USER_DISABLED_MESSAGE = 'This account has been disabled.';
const TOO_MANY_REQUESTS_MESSAGE = 'Too many attempts. Try again later.';
const REQUIRES_RECENT_LOGIN_MESSAGE =
  'For security, enter your current password and try again.';
const NETWORK_MESSAGE = 'Unable to reach the authentication service. Check your connection.';
const UNEXPECTED_MESSAGE = 'Unable to complete authentication.';

function firebaseAuthErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  const code = (error as { code: unknown }).code;
  if (typeof code !== 'string') {
    return undefined;
  }

  return code.replace(/^auth\//, '');
}

const CODE_MAP: Record<string, AuthenticationErrorCode> = {
  'invalid-email': 'invalid-email',
  'missing-email': 'invalid-email',
  'invalid-credential': 'invalid-credentials',
  'invalid-login-credentials': 'invalid-credentials',
  'wrong-password': 'invalid-credentials',
  'user-not-found': 'invalid-credentials',
  'email-already-in-use': 'email-already-in-use',
  'weak-password': 'weak-password',
  'user-disabled': 'user-disabled',
  'too-many-requests': 'too-many-requests',
  'requires-recent-login': 'requires-recent-login',
  'network-request-failed': 'network-unavailable',
};

const MESSAGE_BY_CODE: Record<AuthenticationErrorCode, string> = {
  'invalid-email': INVALID_EMAIL_MESSAGE,
  'invalid-credentials': INVALID_CREDENTIALS_MESSAGE,
  'email-already-in-use': EMAIL_IN_USE_MESSAGE,
  'weak-password': WEAK_PASSWORD_MESSAGE,
  'user-disabled': USER_DISABLED_MESSAGE,
  'too-many-requests': TOO_MANY_REQUESTS_MESSAGE,
  'requires-recent-login': REQUIRES_RECENT_LOGIN_MESSAGE,
  'network-unavailable': NETWORK_MESSAGE,
  unexpected: UNEXPECTED_MESSAGE,
};

/** True only for Firebase's missing-account code. Used by password reset, not sign-in. */
export function isMissingAccountAuthError(error: unknown): boolean {
  return firebaseAuthErrorCode(error) === 'user-not-found';
}

/** Maps Firebase Auth failures into Ignite application-facing authentication errors. */
export function translateAuthError(error: unknown): AuthenticationError {
  if (error instanceof AuthenticationError) {
    return error;
  }

  const firebaseCode = firebaseAuthErrorCode(error);
  const mappedCode = firebaseCode ? CODE_MAP[firebaseCode] : undefined;
  const code: AuthenticationErrorCode = mappedCode ?? 'unexpected';
  return new AuthenticationError(code, MESSAGE_BY_CODE[code]);
}
