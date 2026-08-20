import type { AuthenticatedIdentity } from '../domain/authenticatedIdentity';
import type { EmailPasswordCredentials } from '../domain/emailPasswordCredentials';

export type AuthStateUnsubscribe = () => void;

/** Application-facing authentication contract for Sprint 2 email/password flows. */
export interface AuthRepository {
  getCurrentUser(): AuthenticatedIdentity | null;
  signIn(credentials: EmailPasswordCredentials): Promise<AuthenticatedIdentity>;
  signUp(credentials: EmailPasswordCredentials): Promise<AuthenticatedIdentity>;
  signOut(): Promise<void>;
  sendPasswordResetEmail(email: string): Promise<void>;
  onAuthStateChanged(
    listener: (identity: AuthenticatedIdentity | null) => void,
  ): AuthStateUnsubscribe;
}
