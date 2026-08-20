import type { AuthenticatedIdentity } from '../domain/authenticatedIdentity';
import type { EmailPasswordCredentials } from '../domain/emailPasswordCredentials';
import { translateAuthError } from '../errors/translateAuthError';
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
