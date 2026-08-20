import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import type { FirebaseApp } from 'firebase/app';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';

import { getFirebaseApp } from './firebaseApp';

const AUTH_STORAGE_DATABASE = 'ignite-auth';

let cachedAuth: Auth | undefined;

function createAuthPersistence() {
  return getReactNativePersistence(createAsyncStorage(AUTH_STORAGE_DATABASE));
}

function isAlreadyInitializedError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'auth/already-initialized'
  );
}

/**
 * Returns the Firebase Auth instance for the shared Firebase app.
 * Uses AsyncStorage persistence appropriate for the installed package version.
 */
export function getFirebaseAuth(app: FirebaseApp = getFirebaseApp()): Auth {
  if (cachedAuth) {
    return cachedAuth;
  }

  try {
    cachedAuth = initializeAuth(app, {
      persistence: createAuthPersistence(),
    });
    return cachedAuth;
  } catch (error: unknown) {
    if (isAlreadyInitializedError(error)) {
      cachedAuth = getAuth(app);
      return cachedAuth;
    }

    throw error;
  }
}

/** Test-only hook to reset the module singleton between unit tests. */
export function resetFirebaseAuthForTests(): void {
  cachedAuth = undefined;
}
