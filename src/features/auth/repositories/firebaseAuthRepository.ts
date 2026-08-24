import type {
  ChangeEmailInput,
  ChangePasswordInput,
} from '../domain/accountCredentialChange';
import type { AuthenticatedIdentity } from '../domain/authenticatedIdentity';
import type { EmailPasswordCredentials } from '../domain/emailPasswordCredentials';
import { isMissingAccountAuthError, translateAuthError } from '../errors/translateAuthError';
import type { AuthRepository, AuthStateUnsubscribe } from './authRepository';

export interface AuthFirebaseUserSnapshot {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

/** Smallest Firebase Auth port for authentication. Injected in tests. */
export interface AuthFirebaseSource {
  getCurrentUser(): AuthFirebaseUserSnapshot | null;
  signInWithEmailAndPassword(
    email: string,
    password: string,
  ): Promise<AuthFirebaseUserSnapshot>;
  createUserWithEmailAndPassword(
    email: string,
    password: string,
  ): Promise<AuthFirebaseUserSnapshot>;
  signOut(): Promise<void>;
  sendPasswordResetEmail(email: string): Promise<void>;
  /**
   * Reauthenticates with the current password, then sends verify-before-update email.
   * Reauth is an implementation detail — not exposed on AuthRepository.
   */
  changeEmail(newEmail: string, currentPassword: string): Promise<void>;
  /**
   * Reauthenticates with the current password, then updates the password.
   * Reauth is an implementation detail — not exposed on AuthRepository.
   */
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  reloadCurrentUser(): Promise<AuthFirebaseUserSnapshot | null>;
  onAuthStateChanged(
    listener: (user: AuthFirebaseUserSnapshot | null) => void,
  ): AuthStateUnsubscribe;
}

function toIdentity(snapshot: AuthFirebaseUserSnapshot): AuthenticatedIdentity {
  return {
    uid: snapshot.uid,
    email: snapshot.email,
    emailVerified: snapshot.emailVerified,
  };
}

/** Firebase-backed AuthRepository used by the authentication application layer. */
export class FirebaseAuthRepository implements AuthRepository {
  constructor(private readonly source: AuthFirebaseSource) {}

  getCurrentUser(): AuthenticatedIdentity | null {
    const user = this.source.getCurrentUser();
    return user ? toIdentity(user) : null;
  }

  async signIn(credentials: EmailPasswordCredentials): Promise<AuthenticatedIdentity> {
    try {
      const user = await this.source.signInWithEmailAndPassword(
        credentials.email,
        credentials.password,
      );
      return toIdentity(user);
    } catch (error: unknown) {
      throw translateAuthError(error);
    }
  }

  async signUp(credentials: EmailPasswordCredentials): Promise<AuthenticatedIdentity> {
    try {
      const user = await this.source.createUserWithEmailAndPassword(
        credentials.email,
        credentials.password,
      );
      return toIdentity(user);
    } catch (error: unknown) {
      throw translateAuthError(error);
    }
  }

  async signOut(): Promise<void> {
    try {
      await this.source.signOut();
    } catch (error: unknown) {
      throw translateAuthError(error);
    }
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await this.source.sendPasswordResetEmail(email);
    } catch (error: unknown) {
      if (isMissingAccountAuthError(error)) {
        return;
      }
      throw translateAuthError(error);
    }
  }

  async changeEmail(input: ChangeEmailInput): Promise<void> {
    try {
      await this.source.changeEmail(input.newEmail, input.currentPassword);
    } catch (error: unknown) {
      throw translateAuthError(error);
    }
  }

  async changePassword(input: ChangePasswordInput): Promise<void> {
    try {
      await this.source.changePassword(input.currentPassword, input.newPassword);
    } catch (error: unknown) {
      throw translateAuthError(error);
    }
  }

  async refreshIdentity(): Promise<AuthenticatedIdentity | null> {
    try {
      const user = await this.source.reloadCurrentUser();
      return user ? toIdentity(user) : null;
    } catch (error: unknown) {
      throw translateAuthError(error);
    }
  }

  onAuthStateChanged(
    listener: (identity: AuthenticatedIdentity | null) => void,
  ): AuthStateUnsubscribe {
    return this.source.onAuthStateChanged((user) => {
      listener(user ? toIdentity(user) : null);
    });
  }
}
