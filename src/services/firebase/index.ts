export { getFirebaseApp } from './firebaseApp';
export { getFirebaseAuth, resetFirebaseAuthForTests } from './firebaseAuth';
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
export {
  FIREBASE_FUNCTIONS_REGION,
  getFirebaseFunctions,
  resetFirebaseFunctionsForTests,
} from './firebaseFunctions';
export { createFirebaseService, firebaseService } from './firebaseService';
export { getFirebaseFirestore } from './firestore';
export type { FirebaseService } from './firebaseService';
export type { Unsubscribe } from './types';
