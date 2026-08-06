import { notConnected } from '../errors';
import type {
  AuthCredentials,
  AuthStateListener,
  AuthUser,
  DeckProgress,
  RemoteDeck,
  RemoteVerse,
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

/** Firestore-backed deck/progress surface for Modules B–C. */
export interface DatabaseService {
  listDecks(): Promise<readonly RemoteDeck[]>;
  getDeck(deckId: string): Promise<RemoteDeck | null>;
  getVerses(deckId: string): Promise<readonly RemoteVerse[]>;
  subscribeToDecks(onChange: (decks: readonly RemoteDeck[]) => void): Unsubscribe;
  getDeckProgress(userId: string, deckId: string): Promise<DeckProgress | null>;
  saveDeckProgress(userId: string, progress: DeckProgress): Promise<void>;
}

/** Top-level Firebase facade. Implementations will own SDK init. */
export interface FirebaseService {
  readonly auth: AuthService;
  readonly db: DatabaseService;
  initialize(): Promise<void>;
}

const authStub: AuthService = {
  getCurrentUser: () => notConnected('firebase.auth', 'getCurrentUser'),
  signIn: () => notConnected('firebase.auth', 'signIn'),
  signUp: () => notConnected('firebase.auth', 'signUp'),
  signOut: () => notConnected('firebase.auth', 'signOut'),
  onAuthStateChanged: () => notConnected('firebase.auth', 'onAuthStateChanged'),
};

const dbStub: DatabaseService = {
  listDecks: () => notConnected('firebase.db', 'listDecks'),
  getDeck: () => notConnected('firebase.db', 'getDeck'),
  getVerses: () => notConnected('firebase.db', 'getVerses'),
  subscribeToDecks: () => notConnected('firebase.db', 'subscribeToDecks'),
  getDeckProgress: () => notConnected('firebase.db', 'getDeckProgress'),
  saveDeckProgress: () => notConnected('firebase.db', 'saveDeckProgress'),
};

/** Stub Firebase service — no SDK, no network. */
export const firebaseService: FirebaseService = {
  auth: authStub,
  db: dbStub,
  initialize: () => notConnected('firebase', 'initialize'),
};

export function createFirebaseService(): FirebaseService {
  return firebaseService;
}
