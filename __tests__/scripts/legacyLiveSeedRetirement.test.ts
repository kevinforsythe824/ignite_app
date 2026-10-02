import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import packageJson from '../../package.json';
import {
  LegacyLiveSeedRetiredError,
  refuseLegacyLiveFirestoreSeed,
} from '../../scripts/firestore-seed/seedFirestore';
import {
  TEST_SEED_SEASON_ID,
  TEST_SEED_TITLE,
  buildFirestoreCardSeedRecords,
} from '../../scripts/firestore-seed/buildSeedRecords';
import { LEGACY_TEST_SEASON_TITLE } from '../../scripts/firestore-seed/legacyTestSeasonCleanup';
import {
  TEMPORARY_STUDY_MATERIAL_SET_ID,
  TEMPORARY_STUDY_SEASON_ID,
  TEST_SEASON_ID,
} from '../../src/features/flashcards/domain/testSeason';

const repoRoot = join(__dirname, '../..');

describe('legacy live Firestore seed retirement', () => {
  it('fails before Firebase initialization when the retired entry is called', () => {
    expect(() => refuseLegacyLiveFirestoreSeed()).toThrow(LegacyLiveSeedRetiredError);
    expect(() => refuseLegacyLiveFirestoreSeed()).toThrow(/stops before Firebase initialization/);
    expect(() => refuseLegacyLiveFirestoreSeed()).toThrow(/seasons\/test-season/);
  });

  it('npm run seed:firestore exits before any live write', () => {
    const result = spawnSync('npm', ['run', 'seed:firestore'], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 30000,
      env: process.env,
    });
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;

    expect(result.status).toBe(1);
    expect(output).toMatch(/stops before Firebase initialization/);
    expect(output).not.toMatch(/Seeded season/);
    expect(output).not.toMatch(/initializeApp/);
  }, 35000);

  it('keeps the retired command pointed at the fail-fast entry', () => {
    expect(packageJson.scripts['seed:firestore']).toBe(
      'tsx scripts/firestore-seed/seedFirestore.ts',
    );
    expect(packageJson.scripts['cleanup:legacy-test-season']).toBe(
      'tsx scripts/firestore-seed/cleanupLegacyTestSeason.ts',
    );
    expect(packageJson.scripts['content:import']).toBe(
      'tsx scripts/content-import/cli/importCli.ts',
    );
  });

  it('keeps the local test-season fixture identity and fixture builder', () => {
    expect(TEST_SEASON_ID).toBe('test-season');
    expect(TEST_SEED_SEASON_ID).toBe('test-season');
    expect(TEST_SEED_TITLE).toBe(LEGACY_TEST_SEASON_TITLE);

    const records = buildFirestoreCardSeedRecords([
      {
        id: 'v1',
        reference: 'Luke 2:1',
        verse_text: 'fixture',
        index_code: 'A',
        matched_rules: [],
        tags: [],
      },
    ]);
    expect(records).toEqual([
      {
        cardId: 'v1',
        document: {
          card_number: 1,
          reference: 'Luke 2:1',
          verse_text: 'fixture',
          index_code: 'A',
          matched_rules: [],
          tags: [],
        },
      },
    ]);
  });

  it('keeps live Study on the temporary 2027 / beginner-2027 target', () => {
    expect(TEMPORARY_STUDY_SEASON_ID).toBe('2027');
    expect(TEMPORARY_STUDY_MATERIAL_SET_ID).toBe('beginner-2027');

    const source = readFileSync(
      join(repoRoot, 'src/features/flashcards/screens/FlashcardStudyRoute.tsx'),
      'utf8',
    );
    expect(source).toContain('TEMPORARY_STUDY_SEASON_ID');
    expect(source).toContain('TEMPORARY_STUDY_MATERIAL_SET_ID');
    expect(source).not.toContain('TEST_SEASON_ID');
    expect(source).not.toContain('test-season');
  });
});
