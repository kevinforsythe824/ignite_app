import type {
  AuthenticatedIdentity,
  AuthRepository,
  EmailPasswordCredentials,
} from '../src/features/auth';
import { AuthenticationError } from '../src/features/auth';

export interface AuthRepositoryFake extends AuthRepository {
  emit(identity: AuthenticatedIdentity | null): void;
}

export function createAuthRepositoryFake(options?: {
  emitOnSubscribe?: boolean;
  initialIdentity?: AuthenticatedIdentity | null;
  signInError?: AuthenticationError;
  signUpError?: AuthenticationError;
  resetError?: AuthenticationError;
  changeEmailError?: AuthenticationError;
  changePasswordError?: AuthenticationError;
  signInDelay?: () => Promise<void>;
  signUpDelay?: () => Promise<void>;
  resetDelay?: () => Promise<void>;
}): AuthRepositoryFake {
  let current: AuthenticatedIdentity | null = options?.initialIdentity ?? null;
  const listeners = new Set<(identity: AuthenticatedIdentity | null) => void>();
  const emitOnSubscribe = options?.emitOnSubscribe ?? true;

  const emit = (identity: AuthenticatedIdentity | null) => {
    current = identity;
    listeners.forEach((listener) => listener(identity));
  };

  return {
    emit,
    getCurrentUser: jest.fn(() => current),
    signIn: jest.fn(async (credentials: EmailPasswordCredentials) => {
      if (options?.signInDelay) {
        await options.signInDelay();
      }
      if (options?.signInError) {
        throw options.signInError;
      }
      const identity: AuthenticatedIdentity = {
        uid: 'user-1',
        email: credentials.email,
        emailVerified: false,
      };
      emit(identity);
      return identity;
    }),
    signUp: jest.fn(async (credentials: EmailPasswordCredentials) => {
      if (options?.signUpDelay) {
        await options.signUpDelay();
      }
      if (options?.signUpError) {
        throw options.signUpError;
      }
      const identity: AuthenticatedIdentity = {
        uid: 'user-1',
        email: credentials.email,
        emailVerified: false,
      };
      emit(identity);
      return identity;
    }),
    signOut: jest.fn(async () => {
      emit(null);
    }),
    sendPasswordResetEmail: jest.fn(async () => {
      if (options?.resetDelay) {
        await options.resetDelay();
      }
      if (options?.resetError) {
        throw options.resetError;
      }
    }),
    changeEmail: jest.fn(async () => {
      if (options?.changeEmailError) {
        throw options.changeEmailError;
      }
    }),
    changePassword: jest.fn(async () => {
      if (options?.changePasswordError) {
        throw options.changePasswordError;
      }
    }),
    refreshIdentity: jest.fn(async () => {
      // Return a new object with the same uid so consumers cannot rely on reference equality.
      if (current === null) {
        return null;
      }
      const refreshed = { ...current };
      current = refreshed;
      return refreshed;
    }),
    onAuthStateChanged: jest.fn((listener) => {
      listeners.add(listener);
      if (emitOnSubscribe) {
        listener(current);
      }
      return () => {
        listeners.delete(listener);
      };
    }),
  };
}
