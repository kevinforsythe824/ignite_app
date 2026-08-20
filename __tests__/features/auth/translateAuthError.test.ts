import {
  AuthenticationError,
  translateAuthError,
} from '../../../src/features/auth';

describe('translateAuthError', () => {
  it('returns existing AuthenticationError instances unchanged', () => {
    const existing = new AuthenticationError('invalid-email', 'Enter a valid email address.');
    expect(translateAuthError(existing)).toBe(existing);
  });

  it('maps Firebase auth codes to application-facing errors', () => {
    const translated = translateAuthError({ code: 'auth/wrong-password' });
    expect(translated).toBeInstanceOf(AuthenticationError);
    expect(translated.code).toBe('invalid-credentials');
    expect(translated.message).toBe('Email or password is incorrect.');
  });

  it('maps invalid-login-credentials to invalid-credentials', () => {
    const translated = translateAuthError({ code: 'auth/invalid-login-credentials' });
    expect(translated.code).toBe('invalid-credentials');
    expect(translated.message).not.toContain('auth/');
  });

  it('maps missing-email to invalid-email', () => {
    const translated = translateAuthError({ code: 'auth/missing-email' });
    expect(translated.code).toBe('invalid-email');
    expect(translated.message).not.toContain('auth/');
  });

  it('maps user-disabled, too-many-requests, network, and weak-password', () => {
    expect(translateAuthError({ code: 'auth/user-disabled' }).code).toBe('user-disabled');
    expect(translateAuthError({ code: 'auth/too-many-requests' }).code).toBe('too-many-requests');
    expect(translateAuthError({ code: 'auth/network-request-failed' }).code).toBe(
      'network-unavailable',
    );
    expect(translateAuthError({ code: 'auth/weak-password' }).code).toBe('weak-password');
  });

  it('never exposes raw Firebase code strings in the message', () => {
    const translated = translateAuthError({ code: 'auth/email-already-in-use' });
    expect(translated.message).not.toContain('auth/');
    expect(translated.code).toBe('email-already-in-use');
  });

  it('falls back to unexpected for unknown Firebase codes', () => {
    const translated = translateAuthError({ code: 'auth/unknown-code' });
    expect(translated.code).toBe('unexpected');
    expect(translated.message).toBe('Unable to complete authentication.');
  });
});
