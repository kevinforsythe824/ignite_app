import { notConnected } from '../errors';
import type {
  AuthCredentials,
  AuthStateListener,
  AuthUser,
  Unsubscribe,
} from './types';

/** Email/password auth surface for Module F. */
export interface AuthService {
  getCurrentUser(): Promise<AuthUser | null>;
  signIn(credentials: AuthCredentials): Promise<AuthUser>;
  signUp(credentials: AuthCredentials): Promise<AuthUser>;
  signOut(): Promise<void>;
  onAuthStateChanged(listener: AuthStateListener): Unsubscribe;
}

/**
 * Auth-facing Firebase facade. Auth remains a Sprint 2 stub.
 * App/Firestore initialization lives in firebaseApp.ts and firestore.ts —
 * do not add a generic DatabaseService here.
 */
export interface FirebaseService {
  readonly auth: AuthService;
  initialize(): Promise<void>;
}

const authStub: AuthService = {
  getCurrentUser: () => notConnected('firebase.auth', 'getCurrentUser'),
  signIn: () => notConnected('firebase.auth', 'signIn'),
  signUp: () => notConnected('firebase.auth', 'signUp'),
  signOut: () => notConnected('firebase.auth', 'signOut'),
  onAuthStateChanged: () => notConnected('firebase.auth', 'onAuthStateChanged'),
};

/** Auth stub — SDK app/Firestore init is separate and not invoked from here. */
export const firebaseService: FirebaseService = {
  auth: authStub,
  initialize: () => notConnected('firebase', 'initialize'),
};

export function createFirebaseService(): FirebaseService {
  return firebaseService;
}
