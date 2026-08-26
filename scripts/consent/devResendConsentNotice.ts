/**
 * DEV harness: resend the parental-consent notice email.
 *
 * Usage:
 *   npx tsx scripts/consent/devResendConsentNotice.ts <requestId> <clientSessionToken>
 *
 * Rotates the approval link. Use the new email; do not reuse an old approve URL.
 */

import { loadDevWebFirebaseConfig } from './loadDevWebConfig';

const requestId = process.argv[2];
const clientSessionToken = process.argv[3];

async function main(): Promise<void> {
  if (!requestId || !clientSessionToken) {
    console.error(
      'Usage: tsx scripts/consent/devResendConsentNotice.ts <requestId> <clientSessionToken>',
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

  const resend = httpsCallable(functions, 'resendParentalConsentNotice');
  const result = await resend({ requestId, clientSessionToken });
  console.info(JSON.stringify(result.data, null, 2));
  console.info(
    'If sent, use the NEW approve link in the latest email. Old approve links may no longer work.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
