import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore, type WriteBatch } from 'firebase-admin/firestore';

import {
  buildFirestoreCardSeedRecords,
  TEST_SEED_SEASON_ID,
  TEST_SEED_TITLE,
  type FirestoreCardSeedRecord,
} from './buildSeedRecords';
import { resolveSeedTarget } from './assertSeedTarget';

const BATCH_LIMIT = 400;
const FIXTURE_PATH = resolve(process.cwd(), 'src/data/mock-verse-data.json');
const ENV_LOCAL_PATH = resolve(process.cwd(), '.env.local');

function loadEnvFile(filePath: string): void {
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
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function chunkRecords<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function commitSeasonAndCards(
  records: readonly FirestoreCardSeedRecord[],
): Promise<void> {
  const db = getFirestore();
  const seasonRef = db.collection('seasons').doc(TEST_SEED_SEASON_ID);
  const cardChunks = chunkRecords(records, BATCH_LIMIT - 1);

  for (const [chunkIndex, chunk] of cardChunks.entries()) {
    const batch: WriteBatch = db.batch();
    if (chunkIndex === 0) {
      batch.set(seasonRef, { title: TEST_SEED_TITLE }, { merge: true });
    }
    for (const record of chunk) {
      batch.set(seasonRef.collection('cards').doc(record.cardId), record.document);
    }
    await batch.commit();
  }
}

async function main(): Promise<void> {
  loadEnvFile(ENV_LOCAL_PATH);

  const target = resolveSeedTarget(process.env);
  console.log(
    `[Ignite] Seeding Firestore environment=${target.environment} project=${target.projectId}`,
  );

  const fixtures = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as unknown;
  const records = buildFirestoreCardSeedRecords(fixtures);

  initializeApp({
    credential: applicationDefault(),
    projectId: target.projectId,
  });

  await commitSeasonAndCards(records);

  const firstId = records[0]?.cardId ?? '?';
  const lastId = records[records.length - 1]?.cardId ?? '?';
  console.log(`Seeded season: ${TEST_SEED_SEASON_ID}`);
  console.log(`Cards written: ${records.length}`);
  console.log('Paths:');
  console.log(`seasons/${TEST_SEED_SEASON_ID}/cards/${firstId} ... ${lastId}`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Firestore seed failed: ${message}`);
  process.exitCode = 1;
});
