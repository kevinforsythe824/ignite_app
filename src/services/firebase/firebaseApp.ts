import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';

import { readFirebaseClientConfig, type FirebaseClientConfig } from './firebaseConfig';

/**
 * Returns the Firebase JS SDK app, initializing it once.
 * Reuses an existing default app during Metro fast refresh.
 */
export function getFirebaseApp(config?: FirebaseClientConfig): FirebaseApp {
  const existing = getApps();
  if (existing.length > 0) {
    return existing[0];
  }

  return initializeApp(config ?? readFirebaseClientConfig());
}
