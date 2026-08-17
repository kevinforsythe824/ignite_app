export { getFirebaseApp } from './firebaseApp';
export {
  FIREBASE_CLIENT_ENV_KEYS,
  FirebaseNotConfiguredError,
  readFirebaseClientConfig,
} from './firebaseConfig';
export type { FirebaseClientConfig } from './firebaseConfig';
export {
  IGNITE_ENV_KEY,
  IGNITE_ENVIRONMENT_LABELS,
  IGNITE_ENVIRONMENT_NAMES,
  IGNITE_FIREBASE_PROJECTS,
  FirebaseEnvironmentError,
  assertProjectIdForEnvironment,
  expectedProjectIdFor,
  readIgniteEnvironment,
} from './firebaseEnvironments';
export type { IgniteEnvironmentName } from './firebaseEnvironments';
export { createFirebaseService, firebaseService } from './firebaseService';
export { getFirebaseFirestore } from './firestore';
export type { AuthService, FirebaseService } from './firebaseService';
export type {
  AuthCredentials,
  AuthStateListener,
  AuthUser,
  Unsubscribe,
} from './types';
