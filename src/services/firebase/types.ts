/** Firebase Auth user shape used by the app (SDK-agnostic). */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

/** Deck document as stored remotely (before feature mapping). */
export interface RemoteDeck {
  id: string;
  title: string;
  verseCount: number;
  updatedAt: string | null;
}

/** Verse document as stored remotely. */
export interface RemoteVerse {
  id: string;
  deckId: string;
  reference: string;
  verseText: string;
  indexCode: string;
  matchedRules: readonly RemoteMatchedRule[];
  tags: readonly string[];
}

export interface RemoteMatchedRule {
  ruleName: string;
  ruleCategory: string;
  notes: string;
}

export interface DeckProgress {
  deckId: string;
  masteredVerseIds: readonly string[];
  practicingVerseIds: readonly string[];
  updatedAt: string | null;
}

export type AuthStateListener = (user: AuthUser | null) => void;
export type Unsubscribe = () => void;
