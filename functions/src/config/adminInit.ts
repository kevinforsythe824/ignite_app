import { getApp, initializeApp } from 'firebase-admin/app';

/**
 * Ensures the default Firebase Admin app exists before Firestore/Auth calls.
 * Isolated Gen2 Cloud Run services (e.g. claimParentalConsent-only deploy) do not
 * inherit admin init from other function bundles — use getApp() not getApps().length.
 */
export function ensureFirebaseAdminInitialized(): void {
  try {
    getApp();
  } catch {
    initializeApp();
  }
}
