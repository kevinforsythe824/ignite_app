import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { IGNITE_ENV_KEY, IGNITE_FIREBASE_PROJECTS } from '../../src/services/firebase/firebaseEnvironments';
import { buildFirestoreCardSeedRecords } from '../../scripts/firestore-seed/buildSeedRecords';
import {
  openLegacyTestSeasonAdminPort,
  readSourceForLegacyTestSeason,
  runLegacyTestSeasonCleanup,
} from '../../scripts/firestore-seed/cleanupLegacyTestSeason';
import {
  LEGACY_TEST_SEASON_DOCUMENT_PATH,
  LEGACY_TEST_SEASON_TITLE,
  LegacyTestSeasonCleanupError,
  type LegacyTestSeasonCardSnapshot,
  type LegacyTestSeasonPort,
  type LegacyTestSeasonSnapshot,
  assertDevLegacyTestSeasonCleanupTarget,
  assertLegacyCleanupNotUsingFirestoreEmulator,
  executeLegacyTestSeasonCleanup,
  parseLegacyTestSeasonCleanupArgs,
  planLegacyTestSeasonCleanup,
  readLegacyTestSeasonTree,
} from '../../scripts/firestore-seed/legacyTestSeasonCleanup';

function devEnv(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    [IGNITE_ENV_KEY]: 'dev',
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.dev,
    ...overrides,
  };
}

function legacyCardFields(
  cardNumber: number,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    card_number: cardNumber,
    reference: 'Luke 2:1',
    verse_text: 'fixture',
    index_code: 'A',
    matched_rules: [],
    tags: ['fixture'],
    ...overrides,
  };
}

function legacyCard(
  cardId: string,
  cardNumber: number,
  overrides: Record<string, unknown> = {},
): LegacyTestSeasonCardSnapshot {
  return {
    cardId,
    exists: true,
    subcollectionIds: [],
    data: legacyCardFields(cardNumber, overrides),
  };
}

function legacySnapshot(
  cards: readonly LegacyTestSeasonCardSnapshot[] = [],
): LegacyTestSeasonSnapshot {
  return {
    exists: true,
    data: { title: LEGACY_TEST_SEASON_TITLE },
    subcollectionIds: cards.length > 0 ? ['cards'] : [],
    cards,
  };
}

function createPort(initial: LegacyTestSeasonSnapshot): {
  port: LegacyTestSeasonPort;
  operations: string[];
  preserved: { path: string; data: { seasonId: string; status: string } };
} {
  let state: LegacyTestSeasonSnapshot = {
    exists: initial.exists,
    data: initial.data === null ? null : { ...initial.data },
    subcollectionIds: [...initial.subcollectionIds],
    cards: initial.cards.map((card) => ({
      cardId: card.cardId,
      exists: card.exists,
      subcollectionIds: [...card.subcollectionIds],
      data: card.data === null ? null : { ...card.data },
    })),
  };
  const operations: string[] = [];
  const preserved = {
    path: 'seasons/2027',
    data: { seasonId: '2027', status: 'draft' },
  };
  return {
    preserved,
    operations,
    port: {
      async read() {
        return {
          exists: state.exists,
          data: state.data === null ? null : { ...state.data },
          subcollectionIds: [...state.subcollectionIds],
          cards: state.cards.map((card) => ({
            cardId: card.cardId,
            exists: card.exists,
            subcollectionIds: [...card.subcollectionIds],
            data: card.data === null ? null : { ...card.data },
          })),
        };
      },
      async deleteCard(cardId: string) {
        operations.push(`card:${cardId}`);
        state = {
          ...state,
          cards: state.cards.filter((card) => card.cardId !== cardId),
        };
      },
      async deleteSeason() {
        operations.push('season');
        state = { exists: false, data: null, subcollectionIds: [], cards: [] };
      },
    },
  };
}

interface EnumeratedCard {
  id: string;
  exists: boolean;
  data?: Record<string, unknown>;
  subcollectionIds: readonly string[];
}

function enumeratedSeason(input: {
  exists: boolean;
  data?: Record<string, unknown>;
  subcollectionIds: readonly string[];
  cards: readonly EnumeratedCard[];
}): {
  listDocuments: jest.Mock;
  read: () => ReturnType<typeof readLegacyTestSeasonTree>;
} {
  const listDocuments = jest.fn(async () =>
    input.cards.map((card) => ({
      id: card.id,
      async get() {
        return {
          exists: card.exists,
          data: () => (card.exists ? card.data : undefined),
        };
      },
      async listCollections() {
        return card.subcollectionIds.map((id) => ({ id }));
      },
    })),
  );
  const seasonRef = {
    async get() {
      return {
        exists: input.exists,
        data: () => (input.exists ? input.data : undefined),
      };
    },
    async listCollections() {
      return input.subcollectionIds.map((id) => ({ id }));
    },
    collection(collectionPath: string) {
      if (collectionPath !== 'cards') {
        throw new Error(`unexpected collection ${collectionPath}`);
      }
      return { listDocuments };
    },
  };
  return {
    listDocuments,
    read: () => readLegacyTestSeasonTree(readSourceForLegacyTestSeason(seasonRef)),
  };
}

describe('legacy test-season cleanup', () => {
  it('accepts DEV and the configured DEV project id', () => {
    expect(assertDevLegacyTestSeasonCleanupTarget(devEnv())).toEqual({
      environment: 'dev',
      projectId: IGNITE_FIREBASE_PROJECTS.dev,
    });
    expect(IGNITE_FIREBASE_PROJECTS.dev).toBe('wpf-bible-qizzing');
  });

  it('refuses staging, production, an unknown environment, and a project mismatch', () => {
    expect(() =>
      assertDevLegacyTestSeasonCleanupTarget({
        [IGNITE_ENV_KEY]: 'staging',
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.staging,
      }),
    ).toThrow(/staging/);
    expect(() =>
      assertDevLegacyTestSeasonCleanupTarget({
        [IGNITE_ENV_KEY]: 'prod',
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.prod,
      }),
    ).toThrow(/production/);
    expect(() =>
      assertDevLegacyTestSeasonCleanupTarget({
        [IGNITE_ENV_KEY]: 'qa',
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.dev,
      }),
    ).toThrow(/qa/);
    expect(() =>
      assertDevLegacyTestSeasonCleanupTarget({
        [IGNITE_ENV_KEY]: 'dev',
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.prod,
      }),
    ).toThrow(/mismatch/);
    expect(() => assertDevLegacyTestSeasonCleanupTarget({})).toThrow(/Missing/);
    expect(() =>
      assertDevLegacyTestSeasonCleanupTarget({
        [IGNITE_ENV_KEY]: 'dev',
        FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.dev,
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.staging,
      }),
    ).toThrow(/do not agree/);
  });

  it('does not read Firestore when the environment gate fails', async () => {
    const { port } = createPort(legacySnapshot());
    const read = jest.spyOn(port, 'read');
    await expect(
      executeLegacyTestSeasonCleanup({
        env: { [IGNITE_ENV_KEY]: 'staging', EXPO_PUBLIC_FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.staging },
        apply: true,
        port,
      }),
    ).rejects.toThrow(LegacyTestSeasonCleanupError);
    expect(read).not.toHaveBeenCalled();
  });

  it('always targets seasons/test-season and rejects a Season id argument', () => {
    expect(LEGACY_TEST_SEASON_DOCUMENT_PATH).toBe('seasons/test-season');
    expect(parseLegacyTestSeasonCleanupArgs(['node', 'cleanupLegacyTestSeason.ts'])).toEqual({
      apply: false,
    });
    expect(
      parseLegacyTestSeasonCleanupArgs(['node', 'cleanupLegacyTestSeason.ts', '--apply']),
    ).toEqual({ apply: true });

    for (const args of [
      ['node', 'cleanupLegacyTestSeason.ts', 'test-season'],
      ['node', 'cleanupLegacyTestSeason.ts', '2027'],
      ['node', 'cleanupLegacyTestSeason.ts', '--season', 'test-season'],
      ['node', 'cleanupLegacyTestSeason.ts', '--season=2027'],
      ['node', 'cleanupLegacyTestSeason.ts', '--project', IGNITE_FIREBASE_PROJECTS.dev],
      ['node', 'cleanupLegacyTestSeason.ts', '--apply=false'],
      ['node', 'cleanupLegacyTestSeason.ts', '--apply=true'],
      ['node', 'cleanupLegacyTestSeason.ts', 'apply'],
      ['node', 'cleanupLegacyTestSeason.ts', '--Apply'],
      ['node', 'cleanupLegacyTestSeason.ts', '--apply', 'extra'],
    ]) {
      expect(() => parseLegacyTestSeasonCleanupArgs(args)).toThrow(/does not accept a Season id/);
    }
  });

  it('plans the legacy parent and its cards without deleting on dry-run', async () => {
    const { port, operations, preserved } = createPort(
      legacySnapshot([legacyCard('v2', 2), legacyCard('v1', 1)]),
    );
    const execution = await executeLegacyTestSeasonCleanup({
      env: devEnv(),
      apply: false,
      port,
    });

    expect(execution.deleted).toBe(false);
    expect(execution.target).toEqual({
      environment: 'dev',
      projectId: 'wpf-bible-qizzing',
    });
    expect(execution.plan).toMatchObject({
      outcome: 'delete',
      documentPath: 'seasons/test-season',
      fields: ['title'],
      title: 'Luke 2:1-9',
      cardIds: ['v1', 'v2'],
      cardPaths: ['seasons/test-season/cards/v1', 'seasons/test-season/cards/v2'],
    });
    expect(operations).toEqual([]);
    expect(preserved).toEqual({
      path: 'seasons/2027',
      data: { seasonId: '2027', status: 'draft' },
    });
  });

  it('refuses a modern Season shape and other surprising documents', async () => {
    const modern = planLegacyTestSeasonCleanup({
      exists: true,
      data: {
        title: LEGACY_TEST_SEASON_TITLE,
        seasonId: 'test-season',
        status: 'draft',
        igniteAvailabilityDate: '2026-10-01',
      },
      subcollectionIds: [],
      cards: [],
    });
    expect(modern.outcome).toBe('refused');
    if (modern.outcome === 'refused') {
      expect(modern.reason).toMatch(/modern Season fields/);
      expect(modern.reason).toMatch(/Manual review is required/);
      expect(modern.documentPath).toBe('seasons/test-season');
    }

    const materialSets = planLegacyTestSeasonCleanup({
      ...legacySnapshot(),
      subcollectionIds: ['cards', 'materialSets'],
    });
    expect(materialSets.outcome).toBe('refused');

    const wrongTitle = planLegacyTestSeasonCleanup({
      exists: true,
      data: { title: 'Some other season' },
      subcollectionIds: [],
      cards: [],
    });
    expect(wrongTitle.outcome).toBe('refused');

    const canonicalCard = planLegacyTestSeasonCleanup(
      legacySnapshot([
        {
          cardId: 'c1',
          exists: true,
          subcollectionIds: [],
          data: {
            seasonId: 'test-season',
            materialSetId: 'beginner',
            cardId: 'c1',
            cardNumber: 1,
            reference: 'Luke 2:1',
            verseText: 'fixture',
            sectionId: 's1',
          },
        },
      ]),
    );
    expect(canonicalCard.outcome).toBe('refused');

    const { port, operations } = createPort({
      exists: true,
      data: {
        title: LEGACY_TEST_SEASON_TITLE,
        status: 'draft',
        igniteAvailabilityDate: '2026-10-01',
        endDate: '2027-07-30',
      },
      subcollectionIds: [],
      cards: [],
    });
    await expect(
      executeLegacyTestSeasonCleanup({ env: devEnv(), apply: true, port }),
    ).rejects.toThrow(/modern Season fields/);
    expect(operations).toEqual([]);
  });

  it('apply on a title-only legacy document deletes the parent and no other season', async () => {
    const { port, operations, preserved } = createPort(legacySnapshot());
    const applied = await executeLegacyTestSeasonCleanup({
      env: devEnv(),
      apply: true,
      port,
    });
    expect(applied.deleted).toBe(true);
    expect(applied.plan).toMatchObject({
      outcome: 'delete',
      documentPath: 'seasons/test-season',
      cardIds: [],
      cardPaths: [],
    });
    expect(operations).toEqual(['season']);
    expect(preserved.data).toEqual({ seasonId: '2027', status: 'draft' });
  });

  it('apply deletes legacy cards and then the parent, and a second run is a no-op', async () => {
    const { port, operations, preserved } = createPort(
      legacySnapshot([legacyCard('v1', 1), legacyCard('v2', 2)]),
    );

    const applied = await executeLegacyTestSeasonCleanup({
      env: devEnv(),
      apply: true,
      port,
    });
    expect(applied.deleted).toBe(true);
    expect(applied.plan.outcome).toBe('delete');
    expect(operations).toEqual(['card:v1', 'card:v2', 'season']);
    expect(JSON.stringify(applied.plan)).not.toContain('seasons/2027');
    expect(preserved.path).toBe('seasons/2027');

    const again = await executeLegacyTestSeasonCleanup({
      env: devEnv(),
      apply: true,
      port,
    });
    expect(again.deleted).toBe(false);
    expect(again.plan).toMatchObject({
      outcome: 'absent',
      documentPath: 'seasons/test-season',
    });
    expect(operations).toEqual(['card:v1', 'card:v2', 'season']);

    const dryRunAfter = await executeLegacyTestSeasonCleanup({
      env: devEnv(),
      apply: false,
      port,
    });
    expect(dryRunAfter.plan.outcome).toBe('absent');
    expect(dryRunAfter.deleted).toBe(false);
  });

  it('treats an already absent target as safe for dry-run and apply', async () => {
    const { port, operations } = createPort({
      exists: false,
      data: null,
      subcollectionIds: [],
      cards: [],
    });

    const dryRun = await executeLegacyTestSeasonCleanup({
      env: devEnv(),
      apply: false,
      port,
    });
    const apply = await executeLegacyTestSeasonCleanup({
      env: devEnv(),
      apply: true,
      port,
    });

    expect(dryRun.plan.outcome).toBe('absent');
    expect(apply.plan.outcome).toBe('absent');
    expect(apply.deleted).toBe(false);
    expect(operations).toEqual([]);
  });

  it('refuses leftover children when the parent document is already gone', async () => {
    const { port, operations } = createPort({
      exists: false,
      data: null,
      subcollectionIds: ['cards'],
      cards: [legacyCard('v1', 1)],
    });
    await expect(
      executeLegacyTestSeasonCleanup({ env: devEnv(), apply: true, port }),
    ).rejects.toThrow(/child data remains/);
    expect(operations).toEqual([]);
  });

  it('refuses to open Firestore for any project other than DEV', async () => {
    await expect(openLegacyTestSeasonAdminPort(IGNITE_FIREBASE_PROJECTS.staging)).rejects.toThrow(
      /wpf-bible-qizzing/,
    );
    await expect(openLegacyTestSeasonAdminPort(IGNITE_FIREBASE_PROJECTS.prod)).rejects.toThrow(
      /Refusing to open Firestore/,
    );
    await expect(openLegacyTestSeasonAdminPort('other-project')).rejects.toThrow(
      /Refusing to open Firestore/,
    );
  });

  it('discovers cards with listDocuments and refuses the emulator before Admin import', () => {
    const source = readFileSync(
      join(__dirname, '../../scripts/firestore-seed/cleanupLegacyTestSeason.ts'),
      'utf8',
    );
    expect(source).toContain('.listDocuments()');
    expect(source).not.toContain(
      '.collection(LEGACY_TEST_SEASON_CARDS_COLLECTION).get()',
    );
    const opener = source.slice(source.indexOf('export async function openLegacyTestSeasonAdminPort'));
    const emulatorGate = opener.indexOf('assertLegacyCleanupNotUsingFirestoreEmulator');
    const adminImport = opener.indexOf("await import('firebase-admin/app')");
    expect(emulatorGate).toBeGreaterThan(-1);
    expect(adminImport).toBeGreaterThan(emulatorGate);
  });

  it('refuses FIRESTORE_EMULATOR_HOST before read on dry-run and apply', async () => {
    const env = devEnv({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' });
    for (const apply of [false, true]) {
      const { port, operations } = createPort(legacySnapshot([legacyCard('v1', 1)]));
      const read = jest.spyOn(port, 'read');
      await expect(
        executeLegacyTestSeasonCleanup({ env, apply, port }),
      ).rejects.toThrow(/must not run through the Firestore emulator/);
      expect(read).not.toHaveBeenCalled();
      expect(operations).toEqual([]);
    }
    expect(env.FIRESTORE_EMULATOR_HOST).toBe('127.0.0.1:8080');
    expect(() => assertLegacyCleanupNotUsingFirestoreEmulator({ FIRESTORE_EMULATOR_HOST: '' })).not.toThrow();
    expect(() =>
      assertLegacyCleanupNotUsingFirestoreEmulator({ FIRESTORE_EMULATOR_HOST: '   ' }),
    ).not.toThrow();
  });

  it('refuses the emulator before opening Admin for both dry-run and apply', async () => {
    for (const argv of [
      ['node', 'cleanupLegacyTestSeason.ts'],
      ['node', 'cleanupLegacyTestSeason.ts', '--apply'],
    ]) {
      const calls: string[] = [];
      const env = devEnv();
      await expect(
        runLegacyTestSeasonCleanup({
          argv,
          env,
          loadLocalEnv: (target) => {
            calls.push('load');
            target.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
          },
          openPort: async () => {
            calls.push('open');
            throw new Error('Admin initialization');
          },
        }),
      ).rejects.toThrow(/must not run through the Firestore emulator/);
      expect(calls).toEqual(['load']);
      expect(env.FIRESTORE_EMULATOR_HOST).toBe('127.0.0.1:8080');
    }
  });

  it('checks the Ignite environment before the emulator gate and does not open Admin', async () => {
    const openPort = jest.fn();
    await expect(
      runLegacyTestSeasonCleanup({
        argv: ['node', 'cleanupLegacyTestSeason.ts', '--apply'],
        env: {
          [IGNITE_ENV_KEY]: 'staging',
          EXPO_PUBLIC_FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.staging,
          FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
        },
        openPort,
      }),
    ).rejects.toThrow(/staging/);
    expect(openPort).not.toHaveBeenCalled();
  });

  it('refuses opening the DEV Admin port when the emulator host is set', async () => {
    const env = { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' };
    await expect(
      openLegacyTestSeasonAdminPort(IGNITE_FIREBASE_PROJECTS.dev, env),
    ).rejects.toThrow(/must not run through the Firestore emulator/);
    expect(env.FIRESTORE_EMULATOR_HOST).toBe('127.0.0.1:8080');
  });

  it('accepts a writer-shaped matched rule and refuses malformed tags and rules', async () => {
    const written = buildFirestoreCardSeedRecords([
      {
        id: 'v1',
        reference: 'Luke 2:1',
        verse_text: 'fixture',
        index_code: 'A',
        matched_rules: [{ rule_name: 'Who', rule_category: 'interrogative', notes: '' }],
        tags: ['fixture', ''],
      },
    ]);
    const valid = planLegacyTestSeasonCleanup(
      legacySnapshot([
        {
          cardId: written[0].cardId,
          exists: true,
          subcollectionIds: [],
          data: { ...written[0].document },
        },
      ]),
    );
    expect(valid.outcome).toBe('delete');

    const malformed = [
      legacyCard('v1', 1, { tags: ['ok', 1] }),
      legacyCard('v1', 1, { tags: 'fixture' }),
      legacyCard('v1', 1, {
        matched_rules: [{ rule_name: 'Who', rule_category: 'interrogative', notes: 1 }],
      }),
      legacyCard('v1', 1, { matched_rules: ['Who'] }),
      legacyCard('v1', 1, {
        matched_rules: [
          { rule_name: 'Who', rule_category: 'interrogative', notes: '', extra: true },
        ],
      }),
      legacyCard('v1', 1, {
        matched_rules: [{ rule_name: ' ', rule_category: 'interrogative', notes: '' }],
      }),
    ];
    for (const card of malformed) {
      const { port, operations } = createPort(legacySnapshot([card]));
      await expect(
        executeLegacyTestSeasonCleanup({ env: devEnv(), apply: true, port }),
      ).rejects.toThrow(/legacy flat card shape/);
      expect(operations).toEqual([]);
      expect(planLegacyTestSeasonCleanup(legacySnapshot([card])).outcome).toBe('refused');
    }
  });

  it('refuses a visible card nested subcollection discovered by listDocuments', async () => {
    const enumerated = enumeratedSeason({
      exists: true,
      data: { title: LEGACY_TEST_SEASON_TITLE },
      subcollectionIds: ['cards'],
      cards: [
        {
          id: 'v1',
          exists: true,
          data: legacyCardFields(1),
          subcollectionIds: ['annotations'],
        },
      ],
    });
    const snapshot = await enumerated.read();
    expect(enumerated.listDocuments).toHaveBeenCalledTimes(1);
    expect(snapshot.cards).toEqual([
      expect.objectContaining({
        cardId: 'v1',
        exists: true,
        subcollectionIds: ['annotations'],
      }),
    ]);
    const plan = planLegacyTestSeasonCleanup(snapshot);
    expect(plan.outcome).toBe('refused');
    if (plan.outcome === 'refused') {
      expect(plan.reason).toMatch(/nested subcollections \(annotations\)/);
      expect(plan.reason).toMatch(/entire tree is refused/);
    }
    const operations: string[] = [];
    await expect(
      executeLegacyTestSeasonCleanup({
        env: devEnv(),
        apply: true,
        port: {
          read: () => enumerated.read(),
          async deleteCard(cardId: string) {
            operations.push(`card:${cardId}`);
          },
          async deleteSeason() {
            operations.push('season');
          },
        },
      }),
    ).rejects.toThrow(/nested subcollections/);
    expect(operations).toEqual([]);
  });

  it('refuses a missing card document that still has nested descendants', async () => {
    const enumerated = enumeratedSeason({
      exists: true,
      data: { title: LEGACY_TEST_SEASON_TITLE },
      subcollectionIds: ['cards'],
      cards: [
        {
          id: 'v1',
          exists: true,
          data: legacyCardFields(1),
          subcollectionIds: [],
        },
        {
          id: 'ghost-card',
          exists: false,
          subcollectionIds: ['annotations'],
        },
      ],
    });
    const snapshot = await enumerated.read();
    expect(enumerated.listDocuments).toHaveBeenCalledTimes(1);
    expect(snapshot.cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ cardId: 'v1', exists: true }),
        expect.objectContaining({
          cardId: 'ghost-card',
          exists: false,
          data: null,
          subcollectionIds: ['annotations'],
        }),
      ]),
    );
    const plan = planLegacyTestSeasonCleanup(snapshot);
    expect(plan.outcome).toBe('refused');
    if (plan.outcome === 'refused') {
      expect(plan.reason).toMatch(/ghost-card/);
      expect(plan.reason).toMatch(/has no document/);
      expect(plan.reason).toMatch(/entire tree is refused/);
    }
    const operations: string[] = [];
    await expect(
      executeLegacyTestSeasonCleanup({
        env: devEnv(),
        apply: true,
        port: {
          read: () => enumerated.read(),
          async deleteCard(cardId: string) {
            operations.push(`card:${cardId}`);
          },
          async deleteSeason() {
            operations.push('season');
          },
        },
      }),
    ).rejects.toThrow(/ghost-card/);
    expect(operations).toEqual([]);
  });

  it('enumerates parent-missing trees and refuses any remaining child reference', async () => {
    const absent = enumeratedSeason({
      exists: false,
      subcollectionIds: [],
      cards: [],
    });
    const absentSnapshot = await absent.read();
    expect(absent.listDocuments).toHaveBeenCalledTimes(1);
    expect(planLegacyTestSeasonCleanup(absentSnapshot).outcome).toBe('absent');
    const absentOperations: string[] = [];
    const absentRun = await executeLegacyTestSeasonCleanup({
      env: devEnv(),
      apply: true,
      port: {
        read: () => absent.read(),
        async deleteCard() {
          absentOperations.push('card');
        },
        async deleteSeason() {
          absentOperations.push('season');
        },
      },
    });
    expect(absentRun.deleted).toBe(false);
    expect(absentRun.plan.outcome).toBe('absent');
    expect(absentOperations).toEqual([]);

    const withCard = enumeratedSeason({
      exists: false,
      subcollectionIds: ['cards'],
      cards: [
        {
          id: 'v1',
          exists: true,
          data: legacyCardFields(1),
          subcollectionIds: [],
        },
      ],
    });
    expect(planLegacyTestSeasonCleanup(await withCard.read()).outcome).toBe('refused');

    const withGhost = enumeratedSeason({
      exists: false,
      subcollectionIds: ['cards'],
      cards: [
        {
          id: 'ghost-card',
          exists: false,
          subcollectionIds: ['annotations'],
        },
      ],
    });
    const ghostSnapshot = await withGhost.read();
    expect(ghostSnapshot.cards[0]).toMatchObject({
      cardId: 'ghost-card',
      exists: false,
      subcollectionIds: ['annotations'],
    });
    expect(planLegacyTestSeasonCleanup(ghostSnapshot).outcome).toBe('refused');

    const unexpected = enumeratedSeason({
      exists: false,
      subcollectionIds: ['materialSets'],
      cards: [],
    });
    expect(planLegacyTestSeasonCleanup(await unexpected.read()).outcome).toBe('refused');

    for (const enumerated of [withCard, withGhost, unexpected]) {
      const operations: string[] = [];
      await expect(
        executeLegacyTestSeasonCleanup({
          env: devEnv(),
          apply: true,
          port: {
            read: () => enumerated.read(),
            async deleteCard() {
              operations.push('card');
            },
            async deleteSeason() {
              operations.push('season');
            },
          },
        }),
      ).rejects.toThrow(/child data remains/);
      expect(operations).toEqual([]);
    }
  });

  it('does not delete the parent when a card delete fails, and the next run revalidates', async () => {
    const { port, operations } = createPort(
      legacySnapshot([legacyCard('v1', 1), legacyCard('v2', 2)]),
    );
    let attempts = 0;
    const flaky: LegacyTestSeasonPort = {
      read: () => port.read(),
      deleteSeason: () => port.deleteSeason(),
      async deleteCard(cardId: string) {
        attempts += 1;
        if (attempts === 2) {
          throw new Error('network failure');
        }
        await port.deleteCard(cardId);
      },
    };

    await expect(
      executeLegacyTestSeasonCleanup({ env: devEnv(), apply: true, port: flaky }),
    ).rejects.toThrow(/network failure/);
    expect(operations).toEqual(['card:v1']);

    const again = await executeLegacyTestSeasonCleanup({
      env: devEnv(),
      apply: true,
      port: flaky,
    });
    expect(again.deleted).toBe(true);
    expect(operations).toEqual(['card:v1', 'card:v2', 'season']);
  });
});
