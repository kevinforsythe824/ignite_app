/**
 * @jest-environment node
 */
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { OFFICIAL_DIVISION_IDS } from '../../src/features/season/domain/division';
import type { DivisionId } from '../../src/features/season/domain/division';
import { CONVERTER_VERSION } from '../../scripts/content-pipeline/constants';
import type {
  ContentCardRecord,
  ContentMaterialSetRecord,
  ContentPackage,
  PackageManifest,
} from '../../scripts/content-pipeline/types';
import { IMPORT_PLAN_RUNTIME_PLACEHOLDER } from '../../scripts/content-import/constants';
import { executeContentImport } from '../../scripts/content-import/executeImport';
import { loadValidatedContentPackage } from '../../scripts/content-import/loadPackage';
import { planImportDocuments } from '../../scripts/content-import/planDocuments';
import type { LoadedContentPackage } from '../../scripts/content-import/loadPackage';

const LOCAL_2027_FINGERPRINT =
  'f36c4c0ec9196aeb2351f91a770ce8ceb68c754c4bd2b3d23cfe23dca904f7b9';

const SHARED_REFERENCE = 'Shared 1:1';
const SHARED_VERSE = 'Shared scripture text.';

function annotation(
  materialSetId: string,
  cardId: string,
  phrase: string,
): ContentCardRecord['annotations'][number] {
  return {
    annotationId: `${materialSetId}-${cardId}-${phrase}`,
    cardId,
    type: 'keyword',
    sourceTarget: { strategy: 'phraseOccurrence', phrase, occurrenceIndex: 1 },
    resolvedTarget: { start: 0, end: phrase.length },
  };
}

function buildShapedPackage(): ContentPackage {
  const seasonId = '2027';
  const sectionCounts = [3, 2, 2, 2, 2];
  const materialSets: ContentMaterialSetRecord[] = OFFICIAL_DIVISION_IDS.map(
    (divisionId, divisionIndex) => {
      const materialSetId = `${divisionId}-2027`;
      const sectionCount = sectionCounts[divisionIndex] ?? 2;
      const cards: ContentCardRecord[] = Array.from({ length: 20 }, (_, index) => {
        const cardNumber = index + 1;
        const cardId = `c${cardNumber}`;
        const shared =
          cardNumber === 1 &&
          (divisionId === 'junior' ||
            divisionId === 'intermediate' ||
            divisionId === 'experienced');
        return {
          seasonId,
          materialSetId,
          cardId,
          cardNumber,
          reference: shared ? SHARED_REFERENCE : `${divisionId} ${cardNumber}:1`,
          verseText: shared ? SHARED_VERSE : `Verse ${divisionId} ${cardNumber}`,
          sectionId: `section-${Math.min(sectionCount, Math.floor(index / Math.ceil(20 / sectionCount)) + 1)}`,
          tags: [],
          annotations:
            cardNumber <= 5
              ? [annotation(materialSetId, cardId, shared ? divisionId : 'word')]
              : [],
          crossReferences: [],
        };
      });

      const sections = Array.from({ length: sectionCount }, (_, sectionIndex) => {
        const sectionId = `section-${sectionIndex + 1}`;
        return {
          seasonId,
          materialSetId,
          sectionId,
          title: `${divisionId} section ${sectionIndex + 1}`,
          displayOrder: sectionIndex + 1,
          cardIds: cards.filter((card) => card.sectionId === sectionId).map((card) => card.cardId),
        };
      });

      return {
        seasonId,
        materialSetId,
        divisionId,
        displayName: `${divisionId} fixture`,
        sections,
        cards,
      };
    },
  );

  return {
    schemaVersion: '1.0.0',
    sourceVersion: 'fixture-shaped',
    season: {
      seasonId,
      name: 'Fixture shaped season',
      startDate: '2099-01-01',
      endDate: '2099-12-31',
      status: 'draft',
    },
    materialSets,
  };
}

function loadedFrom(content: ContentPackage, fingerprint: string): LoadedContentPackage {
  const manifest: PackageManifest = {
    schemaVersion: content.schemaVersion,
    seasonId: content.season.seasonId,
    sourceVersion: content.sourceVersion,
    converterVersion: CONVERTER_VERSION,
    materialSets: [],
    cardCounts: { total: 0, byMaterialSet: {} },
    fingerprint,
    validationStatus: 'passed',
    generatedAt: IMPORT_PLAN_RUNTIME_PLACEHOLDER,
  };
  return {
    packageDir: 'fixture',
    content,
    manifest,
    fingerprint,
  };
}

describe('import planner', () => {
  const loaded = loadedFrom(buildShapedPackage(), 'shaped-fingerprint');

  it('plans a 2027-shaped package as 1/5/11/100 documents and 25 annotations', () => {
    const plan = planImportDocuments(loaded);
    expect(plan.counts).toEqual({
      seasons: 1,
      materialSets: 5,
      sections: 11,
      cards: 100,
      annotations: 25,
    });
    expect(plan.documents).toHaveLength(1 + 5 + 11 + 100);
    expect(plan.documents.some((document) => document.path.includes('/annotations/'))).toBe(false);
  });

  it('is deterministic and keeps runtime import fields as placeholders', () => {
    const reversed: ContentPackage = {
      ...loaded.content,
      materialSets: [...loaded.content.materialSets].reverse(),
    };
    const first = planImportDocuments(loaded);
    const second = planImportDocuments(loadedFrom(reversed, loaded.fingerprint));
    expect(second).toEqual(first);
    expect(first.documents[0]?.data.provenance).toMatchObject({
      fingerprint: 'shaped-fingerprint',
      importedAt: IMPORT_PLAN_RUNTIME_PLACEHOLDER,
      environment: IMPORT_PLAN_RUNTIME_PLACEHOLDER,
      importStatus: IMPORT_PLAN_RUNTIME_PLACEHOLDER,
    });
    expect(String(first.documents[0]?.data.provenance && (first.documents[0].data.provenance as { importedAt: string }).importedAt)).toBe(
      IMPORT_PLAN_RUNTIME_PLACEHOLDER,
    );
  });

  it('keeps MaterialSets isolated when scripture text is shared', () => {
    const plan = planImportDocuments(loaded);
    const shared = plan.documents.filter(
      (document) => document.kind === 'card' && document.data.reference === SHARED_REFERENCE,
    );
    const materialSetIds = shared.map((document) => document.data.materialSetId);
    expect(materialSetIds).toEqual(
      expect.arrayContaining(['junior-2027', 'intermediate-2027', 'experienced-2027']),
    );
    expect(new Set(shared.map((document) => document.path)).size).toBe(shared.length);
    expect(shared.length).toBeGreaterThanOrEqual(3);

    const annotationsFor = (divisionId: DivisionId) => {
      const card = shared.find((document) => document.data.materialSetId === `${divisionId}-2027`);
      return card?.data.annotations as Array<{ annotationId: string; cardId: string }>;
    };
    const junior = annotationsFor('junior');
    const intermediate = annotationsFor('intermediate');
    expect(junior?.[0]?.annotationId).not.toBe(intermediate?.[0]?.annotationId);
    expect(junior?.every((item) => item.cardId === 'c1')).toBe(true);
    expect(JSON.stringify(intermediate)).not.toContain(String(junior?.[0]?.annotationId));
  });

  it('rejects an invalid package before planning', async () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'ignite-import-'));
    writeFileSync(
      path.join(directory, 'content.json'),
      JSON.stringify({
        schemaVersion: '9.9.9',
        sourceVersion: 'bad',
        season: {
          seasonId: 'fixture',
          name: 'Bad',
          startDate: '2099-01-01',
          endDate: '2099-12-31',
          status: 'draft',
        },
        materialSets: [],
      }),
    );
    const planDocuments = jest.fn();
    const stdout = jest.fn();
    const code = await executeContentImport({
      packageDir: directory,
      mode: 'offline-plan',
      stdout,
      stderr: jest.fn(),
      planDocuments,
    });
    expect(code).toBe(1);
    expect(planDocuments).not.toHaveBeenCalled();
    expect(stdout).not.toHaveBeenCalled();
  });

  it('plans the committed synthetic package', async () => {
    const synthetic = await loadValidatedContentPackage('content/packages/dev-synthetic-s3');
    const plan = planImportDocuments(synthetic);
    expect(plan.counts.seasons).toBe(1);
    expect(plan.counts.materialSets).toBe(synthetic.manifest.materialSets.length);
    expect(plan.counts.cards).toBe(synthetic.manifest.cardCounts.total);
    expect(plan.fingerprint).toBe(synthetic.manifest.fingerprint);
    expect(plan.documents[0]?.path).toBe(`seasons/${synthetic.content.season.seasonId}`);
  });
});

const localPackageDir = path.join(process.cwd(), 'content/packages/2027');
const hasLocalPackage = existsSync(path.join(localPackageDir, 'content.json'));

(hasLocalPackage ? it : it.skip)(
  'plans the local 2027 package when it is present',
  async () => {
    const loaded = await loadValidatedContentPackage(localPackageDir);
    const plan = planImportDocuments(loaded);
    expect(plan.fingerprint).toBe(LOCAL_2027_FINGERPRINT);
    expect(plan.counts).toEqual({
      seasons: 1,
      materialSets: 5,
      sections: 11,
      cards: 100,
      annotations: 25,
    });

    const cards = plan.documents.filter((document) => document.kind === 'card');
    const refsFor = (materialSetId: string) =>
      cards
        .filter((document) => document.data.materialSetId === materialSetId)
        .map((document) => document.data.reference);
    const shared = refsFor('junior-2027').filter(
      (reference) =>
        refsFor('intermediate-2027').includes(reference) &&
        refsFor('experienced-2027').includes(reference),
    );
    expect(shared.length).toBeGreaterThan(0);
    for (const reference of shared) {
      const matches = cards.filter((document) => document.data.reference === reference);
      expect(new Set(matches.map((document) => document.path)).size).toBe(matches.length);
      for (const card of matches) {
        const annotations = card.data.annotations as Array<{ cardId: string }>;
        expect(annotations.every((item) => item.cardId === card.data.cardId)).toBe(true);
      }
    }
  },
);
