import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import type { ReactNode } from 'react';

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
  signUp(credentials: EmailPasswordCredentials): Promise<void>;
  signOut(): Promise<void>;
  sendPasswordResetEmail(email: string): Promise<void>;
}

export const AuthActionsContext = createContext<AuthActions | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
  repository?: AuthRepository;
}

/** App-root authentication session owner. Does not gate navigation in Phase 1. */
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
    await repositoryRef.current.signUp(credentials);
  }, []);

  const signOut = useCallback(async () => {
    await repositoryRef.current.signOut();
  }, []);

  const sendPasswordResetEmail = useCallback(async (email: string) => {
    await repositoryRef.current.sendPasswordResetEmail(email);
  }, []);

  const actions = useMemo<AuthActions>(
    () => ({ signIn, signUp, signOut, sendPasswordResetEmail }),
    [signIn, signUp, signOut, sendPasswordResetEmail],
  );

  return (
    <AuthSessionContext.Provider value={session}>
      <AuthActionsContext.Provider value={actions}>{children}</AuthActionsContext.Provider>
    </AuthSessionContext.Provider>
  );
}
