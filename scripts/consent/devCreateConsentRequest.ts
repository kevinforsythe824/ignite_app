/**
 * DEV harness: create a parental consent request against deployed/emulator callables.
 *
 * Usage (emulator example):
 *   PARENT_EMAIL_HMAC_SECRET=... IGNITE_ENV=dev \
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *   npx tsx scripts/consent/devCreateConsentRequest.ts parent@example.com
 *
 * Does not mutate consent via raw tokens — parent actions use Hosting session flow.
 */

const parentEmail = process.argv[2];

async function main(): Promise<void> {
  if (!parentEmail) {
    console.error('Usage: tsx scripts/consent/devCreateConsentRequest.ts <parentEmail>');
    process.exit(1);
  }

  // Lazy import so the script stays optional for environments without functions build.
  const { initializeApp } = await import('firebase/app');
  const { getFunctions, httpsCallable, connectFunctionsEmulator } = await import(
    'firebase/functions'
  );

  const projectId = process.env.GCLOUD_PROJECT ?? 'wpf-bible-qizzing';
  const app = initializeApp({
    projectId,
    apiKey: 'dev-harness',
    appId: 'dev-harness',
  });
  const functions = getFunctions(app, 'us-central1');
  if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIRESTORE_EMULATOR_HOST) {
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  }

  const create = httpsCallable(functions, 'createParentalConsentRequest');
  const result = await create({ parentEmail });
  console.info('Created parental consent request:');
  console.info(JSON.stringify(result.data, null, 2));
  console.info(
    'Open the email notice (or Hosting start link) to continue. Do not use raw-token HTTP mutate endpoints.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
