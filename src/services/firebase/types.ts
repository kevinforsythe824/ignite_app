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

export type AuthStateListener = (user: AuthUser | null) => void;
export type Unsubscribe = () => void;
