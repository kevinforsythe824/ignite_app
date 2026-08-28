import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import type { ReactNode } from 'react';

import type {
  ChangeEmailInput,
  ChangePasswordInput,
} from '../domain/accountCredentialChange';
import type { AuthenticatedIdentity } from '../domain/authenticatedIdentity';
import type { EmailPasswordCredentials } from '../domain/emailPasswordCredentials';
import type { AuthRepository } from '../repositories/authRepository';
import { firebaseAuthRepository } from '../repositories';
import {
  authSessionReducer,
  initialAuthSessionState,
} from './authSessionReducer';
import type { AuthSessionState } from './authSessionState';

export const AuthSessionContext = createContext<AuthSessionState | undefined>(
  undefined,
);

export interface AuthActions {
  signIn(credentials: EmailPasswordCredentials): Promise<void>;
  signUp(credentials: EmailPasswordCredentials): Promise<AuthenticatedIdentity>;
  signOut(): Promise<void>;
  sendPasswordResetEmail(email: string): Promise<void>;
  changeEmail(input: ChangeEmailInput): Promise<void>;
  changePassword(input: ChangePasswordInput): Promise<void>;
  refreshIdentity(): Promise<void>;
}

export const AuthActionsContext = createContext<AuthActions | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
  repository?: AuthRepository;
}

/** App-root authentication session owner. RootNavigator gates presentation on session status. */
export function AuthProvider({
  children,
  repository = firebaseAuthRepository,
}: AuthProviderProps): React.JSX.Element {
  const repositoryRef = useRef(repository);
  repositoryRef.current = repository;

  const [session, dispatch] = useReducer(authSessionReducer, initialAuthSessionState);

  useEffect(() => {
    const unsubscribe = repositoryRef.current.onAuthStateChanged((identity) => {
      dispatch({ type: 'auth_state_resolved', identity });
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (credentials: EmailPasswordCredentials) => {
    await repositoryRef.current.signIn(credentials);
  }, []);

  const signUp = useCallback(async (credentials: EmailPasswordCredentials) => {
    const identity = await repositoryRef.current.signUp(credentials);
    // Sync React auth immediately so post-signup claim can bind UID before
    // relying solely on a possibly delayed onAuthStateChanged emission.
    dispatch({ type: 'auth_state_resolved', identity });
    return identity;
  }, []);

  const signOut = useCallback(async () => {
    await repositoryRef.current.signOut();
  }, []);

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    await repositoryRef.current.sendPasswordResetEmail(email);
  }, []);

  const changeEmail = useCallback(async (input: ChangeEmailInput) => {
    await repositoryRef.current.changeEmail(input);
  }, []);

  const changePassword = useCallback(async (input: ChangePasswordInput) => {
    await repositoryRef.current.changePassword(input);
  }, []);

  const refreshIdentity = useCallback(async () => {
    const identity = await repositoryRef.current.refreshIdentity();
    dispatch({ type: 'auth_state_resolved', identity });
  }, []);

  const actions = useMemo<AuthActions>(
    () => ({
      signIn,
      signUp,
      signOut,
      sendPasswordResetEmail,
      changeEmail,
      changePassword,
      refreshIdentity,
    }),
    [
      signIn,
      signUp,
      signOut,
      sendPasswordResetEmail,
      changeEmail,
      changePassword,
      refreshIdentity,
    ],
  );

  return (
    <AuthSessionContext.Provider value={session}>
      <AuthActionsContext.Provider value={actions}>{children}</AuthActionsContext.Provider>
    </AuthSessionContext.Provider>
  );
}
