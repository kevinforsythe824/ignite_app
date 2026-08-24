import type {
  ChangeEmailInput,
  ChangePasswordInput,
} from '../domain/accountCredentialChange';
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
  /**
   * Requests verification of a new email for the current user.
   * Internally reauthenticates; does not change identity email until the user confirms.
   */
  changeEmail(input: ChangeEmailInput): Promise<void>;
  /** Changes the current user's password after internal reauthentication. */
  changePassword(input: ChangePasswordInput): Promise<void>;
  /** Reloads the Firebase Auth user and returns the current AuthenticatedIdentity. */
  refreshIdentity(): Promise<AuthenticatedIdentity | null>;
  onAuthStateChanged(
    listener: (identity: AuthenticatedIdentity | null) => void,
  ): AuthStateUnsubscribe;
}
