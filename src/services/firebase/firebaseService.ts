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
 * Top-level Firebase facade. Implementations will own SDK init.
 * Firestore persistence is intentionally omitted — Sprint 1.75 will add
 * curriculum/progress repositories, not a Deck/Verse database API.
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

/** Stub Firebase service — no SDK, no network, no deck persistence. */
export const firebaseService: FirebaseService = {
  auth: authStub,
  initialize: () => notConnected('firebase', 'initialize'),
};

export function createFirebaseService(): FirebaseService {
  return firebaseService;
}
