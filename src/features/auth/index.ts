export type { AuthenticatedIdentity } from './domain/authenticatedIdentity';
export type { EmailPasswordCredentials } from './domain/emailPasswordCredentials';
export type {
  ChangeEmailInput,
  ChangePasswordInput,
} from './domain/accountCredentialChange';
export { AuthenticationError } from './errors/authenticationError';
export type { AuthenticationErrorCode } from './errors/authenticationError';
export { translateAuthError } from './errors/translateAuthError';
export { useAuth } from './hooks/useAuth';
export type { UseAuthResult } from './hooks/useAuth';
export { AuthNavigator } from './navigation/AuthNavigator';
export { startAccountCreation, ACCOUNT_CREATION_ROUTE } from './navigation/startAccountCreation';
export type { AuthStackParamList, AccountCreationStackParamList } from './navigation/types';
export { IgniteEntryScreen } from './screens/IgniteEntryScreen';
export type { AuthRepository, AuthStateUnsubscribe } from './repositories/authRepository';
export {
  FirebaseAuthRepository,
  createFirebaseAuthSource,
  firebaseAuthRepository,
} from './repositories';
export type { AuthFirebaseSource, AuthFirebaseUserSnapshot } from './repositories';
export { AuthProvider } from './state/AuthProvider';
export type { AuthActions, AuthProviderProps } from './state/AuthProvider';
export type { AuthSessionState } from './state/authSessionState';
export { authSessionReducer, initialAuthSessionState } from './state/authSessionReducer';
export type { AuthSessionAction } from './state/authSessionReducer';
