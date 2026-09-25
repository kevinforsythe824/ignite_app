/**
 * @jest-environment node
 *
 * In-process writer/orchestrator proof against the local Firestore emulator.
 * Do not call the production CLI apply path: that path refuses FIRESTORE_EMULATOR_HOST.
 *
 * Package: content/packages/2027 when that directory is present and its fingerprint
 * matches the accepted package. Otherwise the 2027-shaped in-memory fixture
 * (1 season, 5 material sets, 11 sections, 100 cards, 25 annotations).
 */
import { existsSync } from 'node:fs';

import { initializeApp, getApps, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

import { OFFICIAL_DIVISION_IDS } from '../../src/features/season/domain/division';
import type { DivisionId } from '../../src/features/season/domain/division';
import { IGNITE_FIREBASE_PROJECTS } from '../../src/services/firebase/firebaseEnvironments';
import { applyReplacement } from '../../scripts/content-import/applyReplacement';
import {
  CONTENT_IMPORT_ADMIN_APP_NAME,
  IMPORT_STATUS_COMPLETE,
  IMPORT_STATUS_IMPORTING,
} from '../../scripts/content-import/constants';
import { diffCurriculum } from '../../scripts/content-import/diffPlan';
import { openFirestoreCurriculumWriter } from '../../scripts/content-import/firestoreCurriculumWriter';
import { openFirestoreCurriculumReader } from '../../scripts/content-import/firestoreCurriculumReader';
import {
  loadValidatedContentPackage,
  type LoadedContentPackage,
} from '../../scripts/content-import/loadPackage';
import { planImportDocuments } from '../../scripts/content-import/planDocuments';
import type { ImportPlan } from '../../scripts/content-import/types';
import { CONVERTER_VERSION } from '../../scripts/content-pipeline/constants';
import type { ContentCardRecord, ContentMaterialSetRecord, ContentPackage } from '../../scripts/content-pipeline/types';

const REAL_PACKAGE = 'content/packages/2027';
const ACCEPTED_FINGERPRINT =
  'f36c4c0ec9196aeb2351f91a770ce8ceb68c754c4bd2b3d23cfe23dca904f7b9';
const SEASON_ID = '2027';
const NOW = '2099-06-01T00:00:00.000Z';

const OUTSIDERS = ['seasons/test-season', 'seasons/2027-extra', 'seasons/20270'] as const;

function shapedPackage(): ContentPackage {
  const sectionCounts = [3, 2, 2, 2, 2];
  const materialSets: ContentMaterialSetRecord[] = OFFICIAL_DIVISION_IDS.map((divisionId, divisionIndex) => {
    const materialSetId = `${divisionId}-2027`;
    const sectionCount = sectionCounts[divisionIndex] ?? 2;
    const cards: ContentCardRecord[] = Array.from({ length: 20 }, (_, index) => {
      const cardNumber = index + 1;
      const cardId = `c${cardNumber}`;
      return {
        seasonId: SEASON_ID,
        materialSetId,
        cardId,
        cardNumber,
        reference: `${divisionId} ${cardNumber}:1`,
        verseText: `Verse ${divisionId} ${cardNumber}`,
        sectionId: `section-${Math.min(sectionCount, Math.floor(index / Math.ceil(20 / sectionCount)) + 1)}`,
        tags: cardNumber === 1 ? ['zeta', 'alpha'] : [],
        annotations:
          cardNumber <= 5
            ? [
                {
                  annotationId: `${materialSetId}-${cardId}-word`,
                  cardId,
                  type: 'keyword',
                  sourceTarget: { strategy: 'phraseOccurrence', phrase: 'word', occurrenceIndex: 1 },
                  resolvedTarget: { start: 0, end: 4 },
                },
              ]
            : [],
        crossReferences: [],
      };
    });
    const sections = Array.from({ length: sectionCount }, (_, sectionIndex) => {
      const sectionId = `section-${sectionIndex + 1}`;
      return {
        seasonId: SEASON_ID,
        materialSetId,
        sectionId,
        title: `${divisionId} section ${sectionIndex + 1}`,
        displayOrder: sectionIndex + 1,
        cardIds: cards.filter((card) => card.sectionId === sectionId).map((card) => card.cardId),
      };
    });
    return {
      seasonId: SEASON_ID,
      materialSetId,
      divisionId: divisionId as DivisionId,
      displayName: `${divisionId} fixture`,
      sections,
      cards,
    };
  });
  return {
    schemaVersion: '1.0.0',
    sourceVersion: 'fixture-shaped',
    season: {
      seasonId: SEASON_ID,
      name: 'Fixture shaped season',
      startDate: '2099-01-01',
      endDate: '2099-12-31',
      status: 'draft',
      igniteAvailabilityDate: '2099-02-01',
    },
    materialSets,
  };
}

async function loadPlan(): Promise<{ source: string; plan: ImportPlan }> {
  if (existsSync(REAL_PACKAGE)) {
    const loaded = await loadValidatedContentPackage(REAL_PACKAGE);
    if (loaded.fingerprint !== ACCEPTED_FINGERPRINT) {
      throw new Error(`Refusing ${REAL_PACKAGE}: fingerprint ${loaded.fingerprint} is not the accepted package.`);
    }
    return { source: REAL_PACKAGE, plan: planImportDocuments(loaded) };
  }
  const content = shapedPackage();
  const loaded: LoadedContentPackage = {
    packageDir: 'shaped-fixture',
    content,
    fingerprint: 'shaped-fingerprint',
    manifest: {
      schemaVersion: content.schemaVersion,
      seasonId: SEASON_ID,
      sourceVersion: content.sourceVersion,
      converterVersion: CONVERTER_VERSION,
      materialSets: [],
      cardCounts: { total: 100, byMaterialSet: {} },
      fingerprint: 'shaped-fingerprint',
      validationStatus: 'passed',
      generatedAt: 'planned-at-import',
    },
  };
  return { source: 'shaped-fixture', plan: planImportDocuments(loaded) };
}

function emulatorApp(): App {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('FIRESTORE_EMULATOR_HOST is not set. Run this file through emulators:exec.');
  }
  const existing = getApps().find((app) => app.name === CONTENT_IMPORT_ADMIN_APP_NAME);
  if (existing) {
    return existing;
  }
  return initializeApp({ projectId: IGNITE_FIREBASE_PROJECTS.dev }, CONTENT_IMPORT_ADMIN_APP_NAME);
}

function openWriter(app: App, commits: string[][]) {
  const db = getFirestore(app);
  return openFirestoreCurriculumWriter(app, {
    getFirestore: () => ({
      batch() {
        const write = db.batch();
        const paths: string[] = [];
        return {
          set(documentPath: string, data: Record<string, unknown>) {
            paths.push(`upsert:${documentPath}`);
            write.set(db.doc(documentPath), data);
          },
          delete(documentPath: string) {
            paths.push(`remove:${documentPath}`);
            write.delete(db.doc(documentPath));
          },
          async commit() {
            commits.push([...paths]);
            await write.commit();
          },
        };
      },
    }),
  });
}

async function applyPlan(app: App, plan: ImportPlan, commits: string[][]) {
  const reader = openFirestoreCurriculumReader(
    { environment: 'dev', projectId: IGNITE_FIREBASE_PROJECTS.dev },
    {
      resolveApp: async () => app,
      getFirestore: () => getFirestore(app),
    },
  );
  const snapshot = await reader.loadSeasonCurriculum(plan.seasonId);
  const outcome = await applyReplacement({
    plan,
    snapshot,
    port: openWriter(app, commits),
    now: () => NOW,
    environment: 'dev',
  });
  const after = await reader.loadSeasonCurriculum(plan.seasonId);
  return { outcome, before: snapshot, after, report: diffCurriculum(plan, after) };
}

describe('content import emulator acceptance', () => {
  let app: App;
  let db: Firestore;
  let plan: ImportPlan;
  let packageSource = '';

  beforeAll(async () => {
    app = emulatorApp();
    db = getFirestore(app);
    const loaded = await loadPlan();
    plan = loaded.plan;
    packageSource = loaded.source;
    for (const documentPath of OUTSIDERS) {
      await db.doc(documentPath).set({
        seasonId: documentPath.slice('seasons/'.length),
        marker: 'untouched',
      });
    }
  });

  it('imports, repairs, and isolates the season on the local emulator', async () => {
    expect(plan.counts).toEqual({
      seasons: 1,
      materialSets: 5,
      sections: 11,
      cards: 100,
      annotations: 25,
    });
    expect(plan.documents).toHaveLength(117);
    expect(packageSource === REAL_PACKAGE || packageSource === 'shaped-fixture').toBe(true);

    const firstCommits: string[][] = [];
    const first = await applyPlan(app, plan, firstCommits);
    expect(first.outcome).toBe('applied');
    expect(first.report.counts).toEqual({
      CREATE: 0,
      UPDATE: 0,
      DELETE: 0,
      UNCHANGED: plan.documents.length,
    });

    const seasonSnap = await db.doc(`seasons/${SEASON_ID}`).get();
    const season = seasonSnap.data() ?? {};
    expect(typeof season.startDate).toBe('string');
    expect(typeof season.endDate).toBe('string');
    expect(season.startDate && typeof season.startDate === 'object').toBe(false);
    const provenance = season.provenance as Record<string, unknown>;
    expect(provenance.environment).toBe('dev');
    expect(provenance.importStatus).toBe(IMPORT_STATUS_COMPLETE);
    expect(provenance.importedAt).toBe(NOW);
    expect(provenance.fingerprint).toBe(plan.fingerprint);
    expect(JSON.stringify(season)).not.toContain('planned-at-import');

    const annotated = plan.documents.find(
      (document) => document.kind === 'card' && Array.isArray(document.data.annotations) && document.data.annotations.length > 0,
    );
    expect(annotated).toBeDefined();
    const storedCard = (await db.doc(annotated?.path ?? '').get()).data();
    expect(storedCard?.annotations).toEqual(annotated?.data.annotations);
    expect(storedCard?.tags).toEqual(annotated?.data.tags);
    expect(storedCard?.crossReferences).toEqual(annotated?.data.crossReferences);
    if (!Object.prototype.hasOwnProperty.call(annotated?.data ?? {}, 'indexCode')) {
      expect(storedCard).not.toHaveProperty('indexCode');
    }
    const section = plan.documents.find((document) => document.kind === 'section');
    const storedSection = (await db.doc(section?.path ?? '').get()).data();
    expect(storedSection?.cardIds).toEqual(section?.data.cardIds);
    expect(season.name).toBe(plan.documents.find((document) => document.kind === 'season')?.data.name);

    const quiet: string[][] = [];
    const second = await applyPlan(app, plan, quiet);
    expect(second.outcome).toBe('already-installed');
    expect(quiet).toEqual([]);
    expect((await db.doc(`seasons/${SEASON_ID}`).get()).data()).toEqual(season);

    const staleSet = `seasons/${SEASON_ID}/materialSets/stale-set`;
    await db.doc(`${staleSet}/cards/old`).set({ cardId: 'old' });
    await db.doc(`${staleSet}/sections/old`).set({ sectionId: 'old' });
    await db.doc(staleSet).set({ materialSetId: 'stale-set' });
    const staleCommits: string[][] = [];
    const repairedStale = await applyPlan(app, plan, staleCommits);
    expect(repairedStale.report.counts.DELETE).toBe(0);
    expect((await db.doc(`${staleSet}/cards/old`).get()).exists).toBe(false);
    expect((await db.doc(`${staleSet}/sections/old`).get()).exists).toBe(false);
    expect((await db.doc(staleSet).get()).exists).toBe(false);
    const removals = staleCommits.flat().filter((entry) => entry.startsWith('remove:'));
    expect(removals).toEqual([
      `remove:${staleSet}/cards/old`,
      `remove:${staleSet}/sections/old`,
      `remove:${staleSet}`,
    ]);
    expect(plan.documents.filter((document) => document.kind === 'materialSet')).toHaveLength(5);
    for (const materialSet of plan.documents.filter((document) => document.kind === 'materialSet')) {
      expect((await db.doc(materialSet.path).get()).exists).toBe(true);
    }

    const card = plan.documents.find((document) => document.kind === 'card');
    expect(card).toBeDefined();
    const originalVerse = card?.data.verseText;
    await db.doc(card?.path ?? '').set({ ...(await db.doc(card?.path ?? '').get()).data(), verseText: 'Changed in emulator' });
    const changed = await applyPlan(app, plan, []);
    expect(changed.report.counts).toEqual({ CREATE: 0, UPDATE: 0, DELETE: 0, UNCHANGED: plan.documents.length });
    expect((await db.doc(card?.path ?? '').get()).data()?.verseText).toBe(originalVerse);

    await db.doc(card?.path ?? '').delete();
    const missing = await applyPlan(app, plan, []);
    expect(missing.report.counts.CREATE).toBe(0);
    expect((await db.doc(card?.path ?? '').get()).data()?.verseText).toBe(originalVerse);

    const untouchedCard = plan.documents.find((document) => document.kind === 'card' && document.path !== card?.path);
    await db.doc(untouchedCard?.path ?? '').set({
      ...(await db.doc(untouchedCard?.path ?? '').get()).data(),
      emulatorSentinel: 'keep',
    });
    const installedSeason = (await db.doc(`seasons/${SEASON_ID}`).get()).data() ?? {};
    const installedProvenance = { ...(installedSeason.provenance as Record<string, unknown>) };
    installedProvenance.importStatus = IMPORT_STATUS_IMPORTING;
    await db.doc(`seasons/${SEASON_ID}`).set({ ...installedSeason, provenance: installedProvenance });
    const importingCommits: string[][] = [];
    const finished = await applyPlan(app, plan, importingCommits);
    expect(finished.outcome).toBe('applied');
    expect(importingCommits.flat().every((entry) => entry === `upsert:seasons/${SEASON_ID}`)).toBe(true);
    expect((await db.doc(untouchedCard?.path ?? '').get()).data()?.emulatorSentinel).toBe('keep');
    expect(((await db.doc(`seasons/${SEASON_ID}`).get()).data()?.provenance as { importStatus: string }).importStatus).toBe(
      IMPORT_STATUS_COMPLETE,
    );

    await db.doc(card?.path ?? '').delete();
    await db.doc(`${staleSet}/cards/left-behind`).set({ cardId: 'left-behind' });
    await db.doc(staleSet).set({ materialSetId: 'stale-set' });
    const interruptedSeason = (await db.doc(`seasons/${SEASON_ID}`).get()).data() ?? {};
    const interruptedProvenance = {
      ...(interruptedSeason.provenance as Record<string, unknown>),
      importStatus: IMPORT_STATUS_IMPORTING,
    };
    await db.doc(`seasons/${SEASON_ID}`).set({ ...interruptedSeason, provenance: interruptedProvenance });
    expect(((await db.doc(`seasons/${SEASON_ID}`).get()).data()?.provenance as { importStatus: string }).importStatus).not.toBe(
      IMPORT_STATUS_COMPLETE,
    );
    const recovered = await applyPlan(app, plan, []);
    expect(recovered.outcome).toBe('applied');
    expect(recovered.report.counts).toEqual({ CREATE: 0, UPDATE: 0, DELETE: 0, UNCHANGED: plan.documents.length });
    expect((await db.doc(`${staleSet}/cards/left-behind`).get()).exists).toBe(false);
    expect((await db.doc(staleSet).get()).exists).toBe(false);
    expect(((await db.doc(`seasons/${SEASON_ID}`).get()).data()?.provenance as { importStatus: string }).importStatus).toBe(
      IMPORT_STATUS_COMPLETE,
    );

    for (const documentPath of OUTSIDERS) {
      expect((await db.doc(documentPath).get()).data()).toEqual({
        seasonId: documentPath.slice('seasons/'.length),
        marker: 'untouched',
      });
    }
    expect(packageSource).toBe(existsSync(REAL_PACKAGE) ? REAL_PACKAGE : 'shaped-fixture');
  });
});
