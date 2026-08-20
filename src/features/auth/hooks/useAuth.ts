import { useContext } from 'react';

import type { EmailPasswordCredentials } from '../domain/emailPasswordCredentials';
import { AuthActionsContext, AuthSessionContext } from '../state/AuthProvider';
import type { AuthSessionState } from '../state/authSessionState';

export interface UseAuthResult {
  session: AuthSessionState;
  signIn(credentials: EmailPasswordCredentials): Promise<void>;
  signUp(credentials: EmailPasswordCredentials): Promise<void>;
  signOut(): Promise<void>;
  sendPasswordResetEmail(email: string): Promise<void>;
}

export function useAuth(): UseAuthResult {
  const session = useContext(AuthSessionContext);
  const actions = useContext(AuthActionsContext);

  if (session === undefined || actions === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return {
    session,
    signIn: actions.signIn,
    signUp: actions.signUp,
    signOut: actions.signOut,
    sendPasswordResetEmail: actions.sendPasswordResetEmail,
  };
}
