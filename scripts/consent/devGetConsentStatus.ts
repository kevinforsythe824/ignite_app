/**
 * DEV harness: read authoritative parental consent status.
 *
 * Usage:
 *   npx tsx scripts/consent/devGetConsentStatus.ts <requestId> <clientSessionToken>
 */

import { loadDevWebFirebaseConfig } from './loadDevWebConfig';

const requestId = process.argv[2];
const clientSessionToken = process.argv[3];

async function main(): Promise<void> {
  if (!requestId || !clientSessionToken) {
    console.error(
      'Usage: tsx scripts/consent/devGetConsentStatus.ts <requestId> <clientSessionToken>',
    );
    process.exit(1);
  }

  const web = loadDevWebFirebaseConfig();
  const { initializeApp } = await import('firebase/app');
  const { getFunctions, httpsCallable, connectFunctionsEmulator } = await import(
    'firebase/functions'
  );

  const app = initializeApp({
    apiKey: web.apiKey,
    authDomain: web.authDomain,
    projectId: web.projectId,
    appId: web.appId,
  });
  const functions = getFunctions(app, 'us-central1');
  if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIRESTORE_EMULATOR_HOST) {
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  }

  const getStatus = httpsCallable(functions, 'getParentalConsentStatus');
  const result = await getStatus({ requestId, clientSessionToken });
  console.info(JSON.stringify(result.data, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
