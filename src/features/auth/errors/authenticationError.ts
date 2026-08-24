export type AuthenticationErrorCode =
  | 'invalid-email'
  | 'invalid-credentials'
  | 'email-already-in-use'
  | 'weak-password'
  | 'user-disabled'
  | 'too-many-requests'
  | 'requires-recent-login'
  | 'network-unavailable'
  | 'unexpected';

/** Application-facing authentication failure. UI must not depend on Firebase error codes. */
export class AuthenticationError extends Error {
  readonly code: AuthenticationErrorCode;

  constructor(code: AuthenticationErrorCode, message: string) {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
  }
}
