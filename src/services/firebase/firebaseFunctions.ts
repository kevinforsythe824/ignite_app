import { getFunctions, type Functions } from 'firebase/functions';

import { getFirebaseApp } from './firebaseApp';

/** Cloud Functions region for Ignite callables (matches Hosting / DEV deploy). */
export const FIREBASE_FUNCTIONS_REGION = 'us-central1';

let functionsInstance: Functions | undefined;

/**
 * Returns the Firebase Functions client for the Ignite callable region.
 * Reuses a singleton; not a product TTL or business rule.
 */
export function getFirebaseFunctions(): Functions {
  if (functionsInstance) {
    return functionsInstance;
  }
  functionsInstance = getFunctions(getFirebaseApp(), FIREBASE_FUNCTIONS_REGION);
  return functionsInstance;
}

/** Test-only: clear the Functions singleton between suites. */
export function resetFirebaseFunctionsForTests(): void {
  functionsInstance = undefined;
}
