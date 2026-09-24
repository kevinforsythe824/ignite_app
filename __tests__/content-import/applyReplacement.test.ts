/**
 * @jest-environment node
 */
import { OFFICIAL_DIVISION_IDS } from '../../src/features/season/domain/division';
import type { DivisionId } from '../../src/features/season/domain/division';
import { applyReplacement } from '../../scripts/content-import/applyReplacement';
import { IMPORT_STATUS_COMPLETE, IMPORT_STATUS_IMPORTING } from '../../scripts/content-import/constants';
import { diffCurriculum } from '../../scripts/content-import/diffPlan';
import type { LoadedContentPackage } from '../../scripts/content-import/loadPackage';
import { planImportDocuments } from '../../scripts/content-import/planDocuments';
import type { CurriculumWritePort, ImportPlan, SeasonCurriculumSnapshot } from '../../scripts/content-import/types';
import { CONVERTER_VERSION } from '../../scripts/content-pipeline/constants';
import type { ContentCardRecord, ContentMaterialSetRecord, ContentPackage } from '../../scripts/content-pipeline/types';

class MemoryPort implements CurriculumWritePort {
  readonly docs = new Map<string, Record<string, unknown>>();
  ops: Array<{ kind: 'upsert' | 'remove'; path: string }> = [];
  failOnOperation: number | null = null;
  private operationCount = 0;

  armNextFailure(nthCall: number): void {
    this.failOnOperation = this.operationCount + nthCall;
  }

  async upsert(path: string, data: Record<string, unknown>): Promise<void> {
    this.operationCount += 1;
    if (this.failOnOperation === this.operationCount) {
      throw new Error(`injected failure at ${this.operationCount}`);
    }
    this.docs.set(path, structuredClone(data));
    this.ops.push({ kind: 'upsert', path });
  }

  async remove(path: string): Promise<void> {
    this.operationCount += 1;
    if (this.failOnOperation === this.operationCount) {
      throw new Error(`injected failure at ${this.operationCount}`);
    }
    this.docs.delete(path);
    this.ops.push({ kind: 'remove', path });
  }

  snapshot(seasonId: string): SeasonCurriculumSnapshot {
    return {
      seasonId,
      documents: [...this.docs.entries()].map(([path, data]) => ({
        path,
        data: structuredClone(data),
      })),
    };
  }
}

function annotation(materialSetId: string, cardId: string, phrase: string): ContentCardRecord['annotations'][number] {
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
  const materialSets: ContentMaterialSetRecord[] = OFFICIAL_DIVISION_IDS.map((divisionId, divisionIndex) => {
    const materialSetId = `${divisionId}-2027`;
    const sectionCount = sectionCounts[divisionIndex] ?? 2;
    const cards: ContentCardRecord[] = Array.from({ length: 20 }, (_, index) => {
      const cardNumber = index + 1;
      const cardId = `c${cardNumber}`;
      return {
        seasonId,
        materialSetId,
        cardId,
        cardNumber,
        reference: `${divisionId} ${cardNumber}:1`,
        verseText: `Verse ${divisionId} ${cardNumber}`,
        sectionId: `section-${Math.min(sectionCount, Math.floor(index / Math.ceil(20 / sectionCount)) + 1)}`,
        tags: cardNumber === 1 ? ['zeta', 'alpha'] : [],
        annotations: cardNumber <= 5 ? [annotation(materialSetId, cardId, 'word')] : [],
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
    return { seasonId, materialSetId, divisionId, displayName: `${divisionId} fixture`, sections, cards };
  });
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

function planFrom(content: ContentPackage, fingerprint: string): ImportPlan {
  const loaded: LoadedContentPackage = {
    packageDir: 'fixture',
    content,
    fingerprint,
    manifest: {
      schemaVersion: content.schemaVersion,
      seasonId: content.season.seasonId,
      sourceVersion: content.sourceVersion,
      converterVersion: CONVERTER_VERSION,
      materialSets: [],
      cardCounts: { total: 0, byMaterialSet: {} },
      fingerprint,
      validationStatus: 'passed',
      generatedAt: 'planned-at-import',
    },
  };
  return planImportDocuments(loaded);
}

function smallPlan(): ImportPlan {
  const content: ContentPackage = {
    schemaVersion: '1.0.0',
    sourceVersion: 'small',
    season: {
      seasonId: 'fixture-season',
      name: 'Fixture',
      startDate: '2099-01-01',
      endDate: '2099-12-31',
      status: 'draft',
    },
    materialSets: [
      {
        seasonId: 'fixture-season',
        materialSetId: 'cadet',
        divisionId: 'cadet' as DivisionId,
        displayName: 'Cadet',
        sections: [
          {
            seasonId: 'fixture-season',
            materialSetId: 'cadet',
            sectionId: 'section-1',
            title: 'Section',
            displayOrder: 1,
            cardIds: ['c1'],
          },
        ],
        cards: [
          {
            seasonId: 'fixture-season',
            materialSetId: 'cadet',
            cardId: 'c1',
            cardNumber: 1,
            reference: 'Cadet 1',
            verseText: 'Text',
            sectionId: 'section-1',
            tags: [],
            annotations: [],
            crossReferences: [],
          },
        ],
      },
    ],
  };
  return planFrom(content, 'small-fingerprint');
}

async function applyTo(port: MemoryPort, plan: ImportPlan) {
  return applyReplacement({
    plan,
    snapshot: port.snapshot(plan.seasonId),
    port,
    now: () => '2099-06-01T00:00:00.000Z',
    environment: 'dev',
  });
}

describe('applyReplacement', () => {
  it('round-trips the shaped fixture and writes no curriculum on the second apply', async () => {
    const plan = planFrom(buildShapedPackage(), 'shaped-fingerprint');
    expect(plan.counts).toEqual({
      seasons: 1,
      materialSets: 5,
      sections: 11,
      cards: 100,
      annotations: 25,
    });
    const port = new MemoryPort();
    port.docs.set('seasons/test-season', { seasonId: 'test-season', status: 'draft' });
    port.docs.set('seasons/test-season/materialSets/cadet/cards/c1', { cardId: 'c1' });

    expect(await applyTo(port, plan)).toBe('applied');
    const installed = port.snapshot(plan.seasonId);
    const report = diffCurriculum(plan, installed);
    expect(report.counts).toEqual({ CREATE: 0, UPDATE: 0, DELETE: 0, UNCHANGED: plan.documents.length });
    expect(report.fingerprintMatches).toBe(true);
    expect(report.installedFingerprint).toBe('shaped-fingerprint');
    const season = installed.documents.find((document) => document.path === 'seasons/2027');
    const provenance = season?.data.provenance as Record<string, unknown>;
    expect(provenance.importStatus).toBe(IMPORT_STATUS_COMPLETE);
    expect(provenance.environment).toBe('dev');
    expect(provenance.importedAt).toBe('2099-06-01T00:00:00.000Z');
    expect(JSON.stringify(season?.data)).not.toContain('planned-at-import');
    expect(season?.data.startDate).toBe('2099-01-01');
    expect(season?.data).not.toHaveProperty('sourceMaterialReleaseDate');

    const card = installed.documents.find((document) => document.path.endsWith('/cards/c1') && document.path.includes('cadet-2027'));
    expect(card?.data.tags).toEqual(['zeta', 'alpha']);
    expect(card?.data).not.toHaveProperty('indexCode');
    expect(card?.data.annotations).toEqual(
      plan.documents.find((document) => document.path === card?.path)?.data.annotations,
    );
    const section = installed.documents.find((document) => document.path.includes('cadet-2027/sections/'));
    expect(section?.data.cardIds).toEqual(
      plan.documents.find((document) => document.path === section?.path)?.data.cardIds,
    );

    port.ops = [];
    expect(await applyTo(port, plan)).toBe('already-installed');
    expect(port.ops).toEqual([]);
    expect(port.docs.get('seasons/test-season')).toEqual({ seasonId: 'test-season', status: 'draft' });
    expect(port.docs.get('seasons/test-season/materialSets/cadet/cards/c1')).toEqual({ cardId: 'c1' });
  });

  it('repairs one card and finishes provenance without rewriting unchanged curriculum', async () => {
    const plan = smallPlan();
    const port = new MemoryPort();
    await applyTo(port, plan);
    const cardPath = 'seasons/fixture-season/materialSets/cadet/cards/c1';
    const card = port.docs.get(cardPath);
    port.docs.set(cardPath, { ...card, verseText: 'Changed' });
    const season = port.docs.get('seasons/fixture-season');
    const provenance = { ...(season?.provenance as Record<string, unknown>), importStatus: IMPORT_STATUS_IMPORTING };
    port.docs.set('seasons/fixture-season', { ...season, provenance });
    port.ops = [];

    await applyTo(port, plan);
    const curriculumOps = port.ops.filter((op) => op.path !== 'seasons/fixture-season');
    expect(curriculumOps).toEqual([{ kind: 'upsert', path: cardPath }]);
    expect(port.ops[0]).toEqual({ kind: 'upsert', path: 'seasons/fixture-season' });
    expect(port.ops[port.ops.length - 1]?.path).toBe('seasons/fixture-season');
    expect((port.docs.get('seasons/fixture-season')?.provenance as { importStatus: string }).importStatus).toBe(
      IMPORT_STATUS_COMPLETE,
    );
  });

  it('removes a stale nested material set child-first', async () => {
    const plan = smallPlan();
    const port = new MemoryPort();
    await applyTo(port, plan);
    port.docs.set('seasons/fixture-season/materialSets/stale-set', { materialSetId: 'stale-set' });
    port.docs.set('seasons/fixture-season/materialSets/stale-set/sections/old', { sectionId: 'old' });
    port.docs.set('seasons/fixture-season/materialSets/stale-set/cards/old', { cardId: 'old' });
    port.ops = [];

    await applyTo(port, plan);
    const removals = port.ops.filter((op) => op.kind === 'remove').map((op) => op.path);
    expect(removals).toEqual([
      'seasons/fixture-season/materialSets/stale-set/cards/old',
      'seasons/fixture-season/materialSets/stale-set/sections/old',
      'seasons/fixture-season/materialSets/stale-set',
    ]);
    expect(port.docs.has('seasons/fixture-season/materialSets/stale-set')).toBe(false);
  });

  it('aborts a foreign path before any write', async () => {
    const plan = smallPlan();
    plan.documents.push({
      path: 'seasons/test-season/materialSets/cadet/cards/c9',
      kind: 'card',
      data: { cardId: 'c9', verseText: 'nope' },
    });
    const port = new MemoryPort();
    port.docs.set('seasons/test-season', { seasonId: 'test-season' });
    await expect(applyTo(port, plan)).rejects.toThrow(/outside season/);
    expect(port.ops).toEqual([]);
    expect(port.docs.get('seasons/test-season')).toEqual({ seasonId: 'test-season' });
  });

  it('keeps importing when a write fails and converges on rerun', async () => {
    const plan = smallPlan();
    const other = { seasonId: 'test-season', status: 'draft' };
    const cases = [
      { label: 'after importing', failOnOperation: 2 },
      { label: 'before complete', failOnOperation: plan.documents.length + 1 },
    ];
    for (const testCase of cases) {
      const port = new MemoryPort();
      port.docs.set('seasons/test-season', other);
      port.failOnOperation = testCase.failOnOperation;
      await expect(applyTo(port, plan)).rejects.toThrow(/injected failure/);
      const season = port.docs.get('seasons/fixture-season');
      expect((season?.provenance as { importStatus?: string } | undefined)?.importStatus).not.toBe(IMPORT_STATUS_COMPLETE);
      if (season) {
        expect((season.provenance as { importStatus: string }).importStatus).toBe(IMPORT_STATUS_IMPORTING);
      }
      expect(port.docs.get('seasons/test-season')).toEqual(other);
      port.failOnOperation = null;
      expect(await applyTo(port, plan)).toBe('applied');
      const report = diffCurriculum(plan, port.snapshot(plan.seasonId));
      expect(report.counts.CREATE).toBe(0);
      expect(report.counts.UPDATE).toBe(0);
      expect(report.counts.DELETE).toBe(0);
      expect((port.docs.get('seasons/fixture-season')?.provenance as { importStatus: string }).importStatus).toBe(
        IMPORT_STATUS_COMPLETE,
      );
      expect(port.docs.get('seasons/test-season')).toEqual(other);
    }

    const deleting = new MemoryPort();
    deleting.docs.set('seasons/test-season', other);
    await applyTo(deleting, plan);
    deleting.docs.set('seasons/fixture-season/materialSets/stale-set/cards/old', { cardId: 'old' });
    deleting.docs.set('seasons/fixture-season/materialSets/stale-set/sections/old', { sectionId: 'old' });
    deleting.docs.set('seasons/fixture-season/materialSets/stale-set', { materialSetId: 'stale-set' });
    deleting.ops = [];
    deleting.armNextFailure(2);
    await expect(applyTo(deleting, plan)).rejects.toThrow(/injected failure/);
    expect((deleting.docs.get('seasons/fixture-season')?.provenance as { importStatus: string }).importStatus).toBe(
      IMPORT_STATUS_IMPORTING,
    );
    expect(deleting.docs.has('seasons/fixture-season/materialSets/stale-set/cards/old')).toBe(true);
    deleting.failOnOperation = null;
    expect(await applyTo(deleting, plan)).toBe('applied');
    expect(diffCurriculum(plan, deleting.snapshot(plan.seasonId)).counts.DELETE).toBe(0);
    expect(deleting.docs.get('seasons/test-season')).toEqual(other);
  });
});
