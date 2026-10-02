/**
 * Retired live Firestore seed entry.
 * Fails before environment reads, Firebase initialization, and writes.
 * Local fixture helpers live in buildSeedRecords.ts.
 */

export class LegacyLiveSeedRetiredError extends Error {
  constructor() {
    super(
      'The legacy live Firestore seed is retired and stops before Firebase initialization. It cannot write seasons/test-season for DEV, STAGING, or PROD. Use the content import pipeline (npm run content:import) for curriculum. Local and unit fixtures may still use the test-season identity. Stale DEV cleanup is a separate command: npm run cleanup:legacy-test-season (dry-run unless --apply).',
    );
    this.name = 'LegacyLiveSeedRetiredError';
  }
}

/** Live seed entry. Never opens Firebase. */
export function refuseLegacyLiveFirestoreSeed(): never {
  throw new LegacyLiveSeedRetiredError();
}

function main(): void {
  refuseLegacyLiveFirestoreSeed();
}

const invokedPath = process.argv[1] ?? '';
if (
  invokedPath.endsWith('/seedFirestore.ts') ||
  invokedPath.endsWith('/seedFirestore.js')
) {
  try {
    main();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Firestore seed failed: ${message}`);
    process.exitCode = 1;
  }
}
