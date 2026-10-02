import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { IGNITE_FIREBASE_PROJECTS } from '../../src/services/firebase/firebaseEnvironments';
import {
  LEGACY_TEST_SEASON_CARDS_COLLECTION,
  LEGACY_TEST_SEASON_DOCUMENT_ID,
  LegacyTestSeasonCleanupError,
  type LegacyTestSeasonCleanupExecution,
  type LegacyTestSeasonPort,
  type LegacyTestSeasonReadSource,
  type LegacyTestSeasonSnapshot,
  assertDevLegacyTestSeasonCleanupTarget,
  assertLegacyCleanupNotUsingFirestoreEmulator,
  executeLegacyTestSeasonCleanup,
  parseLegacyTestSeasonCleanupArgs,
  readLegacyTestSeasonTree,
} from './legacyTestSeasonCleanup';

const CLEANUP_ADMIN_APP_NAME = 'ignite-legacy-test-season-cleanup';
const SENSITIVE_ENV_KEY = /PRIVATE|SECRET|CREDENTIAL|SERVICE_ACCOUNT/i;

function shouldSkipEnvKey(key: string): boolean {
  return key === 'GOOGLE_APPLICATION_CREDENTIALS' || SENSITIVE_ENV_KEY.test(key);
}

function loadUnsetEnvFile(
  filePath: string,
  env: Record<string, string | undefined> = process.env,
): void {
  if (!existsSync(filePath)) {
    return;
  }
  for (const rawLine of readFileSync(filePath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }
    const separator = line.indexOf('=');
    if (separator <= 0) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (shouldSkipEnvKey(key)) {
      continue;
    }
    if (env[key] === undefined) {
      env[key] = value;
    }
  }
}

/**
 * Binds Admin document/collection refs to the testable reader.
 * Card discovery calls listDocuments(), which includes missing documents that
 * still have descendants. collection().get() does not.
 */
export function readSourceForLegacyTestSeason(seasonRef: {
  get(): Promise<{ readonly exists: boolean; data(): unknown }>;
  listCollections(): Promise<readonly { readonly id: string }[]>;
  collection(collectionPath: string): {
    listDocuments(): Promise<
      readonly {
        readonly id: string;
        get(): Promise<{ readonly exists: boolean; data(): unknown }>;
        listCollections(): Promise<readonly { readonly id: string }[]>;
      }[]
    >;
  };
}): LegacyTestSeasonReadSource {
  return {
    get: () => seasonRef.get(),
    listCollections: () => seasonRef.listCollections(),
    listCardDocuments: () =>
      seasonRef.collection(LEGACY_TEST_SEASON_CARDS_COLLECTION).listDocuments(),
  };
}

/**
 * Opens Firestore only for the known DEV project, and only at seasons/test-season.
 * Callers must pass the project id already verified as DEV.
 * Emulator host is refused before firebase-admin is imported.
 */
export async function openLegacyTestSeasonAdminPort(
  projectId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<LegacyTestSeasonPort> {
  if (projectId !== IGNITE_FIREBASE_PROJECTS.dev) {
    throw new LegacyTestSeasonCleanupError(
      `Refusing to open Firestore for "${projectId}". This cleanup only opens the DEV project ${IGNITE_FIREBASE_PROJECTS.dev}.`,
    );
  }
  assertLegacyCleanupNotUsingFirestoreEmulator(env);

  const { applicationDefault, getApps, initializeApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');

  const existing = getApps().find((app) => app.name === CLEANUP_ADMIN_APP_NAME);
  if (existing && existing.options.projectId !== projectId) {
    throw new LegacyTestSeasonCleanupError(
      `Cleanup Admin app is already initialized for "${existing.options.projectId ?? ''}", expected "${projectId}".`,
    );
  }

  const app =
    existing ??
    initializeApp({ credential: applicationDefault(), projectId }, CLEANUP_ADMIN_APP_NAME);
  if (app.options.projectId !== projectId) {
    throw new LegacyTestSeasonCleanupError(
      `Cleanup Admin app initialized for "${app.options.projectId ?? ''}", expected "${projectId}".`,
    );
  }

  const db = getFirestore(app);
  const seasonRef = db.collection('seasons').doc(LEGACY_TEST_SEASON_DOCUMENT_ID);

  return {
    async read(): Promise<LegacyTestSeasonSnapshot> {
      return readLegacyTestSeasonTree(readSourceForLegacyTestSeason(seasonRef));
    },
    async deleteCard(cardId: string): Promise<void> {
      if (!/^[A-Za-z0-9_-]+$/.test(cardId)) {
        throw new LegacyTestSeasonCleanupError(
          `Refusing to delete unexpected card id "${cardId}".`,
        );
      }
      await seasonRef.collection(LEGACY_TEST_SEASON_CARDS_COLLECTION).doc(cardId).delete();
    },
    async deleteSeason(): Promise<void> {
      await seasonRef.delete();
    },
  };
}

function printExecution(execution: LegacyTestSeasonCleanupExecution, apply: boolean): void {
  const { plan } = execution;
  console.log(`Document: ${plan.documentPath}`);
  if (plan.outcome === 'absent') {
    console.log('Already absent. No documents deleted.');
    return;
  }
  console.log(`Fields: ${plan.fields.join(', ')}`);
  console.log(`Title: ${plan.title}`);
  console.log(`Legacy cards: ${plan.cardIds.length}`);
  for (const cardPath of plan.cardPaths) {
    console.log(`  ${cardPath}`);
  }
  console.log(`  ${plan.documentPath}`);
  if (apply && execution.deleted) {
    console.log('Deleted the legacy fixture parent and its cards.');
    return;
  }
  console.log('Dry run. No documents were written or deleted.');
}

/**
 * Production CLI order:
 * 1. parse args
 * 2. load .env.local
 * 3–5. Ignite env, DEV project id, conflicting project ids
 * 6. refuse FIRESTORE_EMULATOR_HOST
 * 7. dynamically import and initialize Firebase Admin
 * 8. read DEV
 * No Firestore access happens before those gates. `--apply` uses the same gates.
 */
export async function runLegacyTestSeasonCleanup(input: {
  argv: readonly string[];
  env: Record<string, string | undefined>;
  openPort: (
    projectId: string,
    env: Record<string, string | undefined>,
  ) => Promise<LegacyTestSeasonPort>;
  loadLocalEnv?: (env: Record<string, string | undefined>) => void;
  onReady?: (target: { environment: 'dev'; projectId: string }, apply: boolean) => void;
}): Promise<{ execution: LegacyTestSeasonCleanupExecution; apply: boolean }> {
  const parsed = parseLegacyTestSeasonCleanupArgs(input.argv);
  input.loadLocalEnv?.(input.env);
  const target = assertDevLegacyTestSeasonCleanupTarget(input.env);
  assertLegacyCleanupNotUsingFirestoreEmulator(input.env);
  input.onReady?.(target, parsed.apply);
  const port = await input.openPort(target.projectId, input.env);
  const execution = await executeLegacyTestSeasonCleanup({
    env: input.env,
    apply: parsed.apply,
    port,
  });
  return { execution, apply: parsed.apply };
}

async function main(): Promise<void> {
  const { execution, apply } = await runLegacyTestSeasonCleanup({
    argv: process.argv,
    env: process.env,
    openPort: openLegacyTestSeasonAdminPort,
    loadLocalEnv: (env) => {
      loadUnsetEnvFile(path.join(process.cwd(), '.env.local'), env);
    },
    onReady: (target, applying) => {
      console.log(
        `[Ignite] Legacy test-season cleanup environment=${target.environment} project=${target.projectId} mode=${applying ? 'apply' : 'dry-run'}`,
      );
    },
  });
  printExecution(execution, apply);
}

const invokedPath = process.argv[1] ?? '';
if (
  invokedPath.endsWith(`${path.sep}cleanupLegacyTestSeason.ts`) ||
  invokedPath.endsWith(`${path.sep}cleanupLegacyTestSeason.js`)
) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Legacy test-season cleanup failed.';
    console.error(message);
    process.exitCode = 1;
  });
}
