import { useContext } from 'react';

import type {
  ChangeEmailInput,
  ChangePasswordInput,
} from '../domain/accountCredentialChange';
import type { AuthenticatedIdentity } from '../domain/authenticatedIdentity';
import type { EmailPasswordCredentials } from '../domain/emailPasswordCredentials';
import { AuthActionsContext, AuthSessionContext } from '../state/AuthProvider';
import type { AuthSessionState } from '../state/authSessionState';

export interface UseAuthResult {
  session: AuthSessionState;
  identity: AuthenticatedIdentity | null;
  signIn(credentials: EmailPasswordCredentials): Promise<void>;
  signUp(credentials: EmailPasswordCredentials): Promise<void>;
  signOut(): Promise<void>;
  sendPasswordResetEmail(email: string): Promise<void>;
  changeEmail(input: ChangeEmailInput): Promise<void>;
  changePassword(input: ChangePasswordInput): Promise<void>;
  refreshIdentity(): Promise<void>;
}

export function useAuth(): UseAuthResult {
  const session = useContext(AuthSessionContext);
  const actions = useContext(AuthActionsContext);

  if (session === undefined || actions === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return {
    session,
    identity: session.status === 'authenticated' ? session.identity : null,
    signIn: actions.signIn,
    signUp: actions.signUp,
    signOut: actions.signOut,
    sendPasswordResetEmail: actions.sendPasswordResetEmail,
    changeEmail: actions.changeEmail,
    changePassword: actions.changePassword,
    refreshIdentity: actions.refreshIdentity,
  };
}
