/**
 * @jest-environment node
 */
import { planImportDocuments } from '../../scripts/content-import/planDocuments';
import { diffCurriculum } from '../../scripts/content-import/diffPlan';
import {
  ALREADY_INSTALLED_OUTPUT,
  FINGERPRINT_DRIFT_OUTPUT,
  formatDevDiff,
} from '../../scripts/content-import/formatReport';
import type { ImportPlan, SeasonCurriculumSnapshot, StoredCurriculumDocument } from '../../scripts/content-import/types';
import type { ContentPackage } from '../../scripts/content-pipeline/types';
import type { LoadedContentPackage } from '../../scripts/content-import/loadPackage';
import { CONVERTER_VERSION } from '../../scripts/content-pipeline/constants';

function packageFixture(): ContentPackage {
  const seasonId = 'fixture-season';
  const card = (
    materialSetId: string,
    cardNumber: number,
    verseText: string,
  ) => ({
    seasonId,
    materialSetId,
    cardId: `c${cardNumber}`,
    cardNumber,
    reference: `${materialSetId} ${cardNumber}`,
    verseText,
    sectionId: 'section-1',
    tags: [],
    annotations: [],
    crossReferences: [],
  });
  const materialSet = (materialSetId: string, divisionId: ContentPackage['materialSets'][number]['divisionId']) => ({
    seasonId,
    materialSetId,
    divisionId,
    displayName: materialSetId,
    sections: [
      {
        seasonId,
        materialSetId,
        sectionId: 'section-1',
        title: 'Section',
        displayOrder: 1,
        cardIds: ['c1'],
      },
    ],
    cards: [card(materialSetId, 1, `Text ${materialSetId}`)],
  });

  return {
    schemaVersion: '1.0.0',
    sourceVersion: 'fixture',
    season: {
      seasonId,
      name: 'Fixture',
      startDate: '2099-01-01',
      endDate: '2099-12-31',
      status: 'draft',
    },
    materialSets: [
      materialSet('cadet', 'cadet'),
      materialSet('beginner', 'beginner'),
      materialSet('junior', 'junior'),
      materialSet('intermediate', 'intermediate'),
      materialSet('experienced', 'experienced'),
    ],
  };
}

function planWithFingerprint(fingerprint: string): ImportPlan {
  const content = packageFixture();
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
      cardCounts: { total: 5, byMaterialSet: {} },
      fingerprint,
      validationStatus: 'passed',
      generatedAt: 'planned-at-import',
    },
  };
  return planImportDocuments(loaded);
}

function snapshotFrom(plan: ImportPlan, fingerprint = plan.fingerprint): SeasonCurriculumSnapshot {
  const documents: StoredCurriculumDocument[] = plan.documents.map((document) => {
    if (document.kind !== 'season') {
      return { path: document.path, data: { ...document.data } };
    }
    const provenance = {
      ...(document.data.provenance as Record<string, unknown>),
      fingerprint,
      importedAt: '2020-01-01T00:00:00.000Z',
    };
    return {
      path: document.path,
      data: { ...document.data, provenance, updatedAt: 'server-time' },
    };
  });
  return { seasonId: plan.seasonId, documents };
}

function classifications(plan: ImportPlan, snapshot: SeasonCurriculumSnapshot) {
  return diffCurriculum(plan, snapshot);
}

describe('curriculum diff', () => {
  const plan = planWithFingerprint('package-fingerprint');

  it('classifies an empty snapshot as all CREATE', () => {
    const report = classifications(plan, { seasonId: plan.seasonId, documents: [] });
    expect(report.counts.CREATE).toBe(plan.documents.length);
    expect(report.counts.UPDATE).toBe(0);
    expect(report.counts.DELETE).toBe(0);
    expect(report.counts.UNCHANGED).toBe(0);
  });

  it('classifies an identical tree as all UNCHANGED and ignores import timestamps', () => {
    const report = classifications(plan, snapshotFrom(plan, 'other-fingerprint'));
    expect(report.counts.UNCHANGED).toBe(plan.documents.length);
    expect(report.counts.UPDATE).toBe(0);
    expect(report.contentMatches).toBe(true);
    expect(report.outcome).toBe('differences');
  });

  it('classifies a missing card as CREATE', () => {
    const snapshot = snapshotFrom(plan);
    const cardPath = plan.documents.find((document) => document.kind === 'card')?.path;
    snapshot.documents = snapshot.documents.filter((document) => document.path !== cardPath);
    const report = classifications(plan, snapshot);
    expect(report.entries.find((entry) => entry.path === cardPath)?.classification).toBe('CREATE');
  });

  it('classifies a modified card as UPDATE', () => {
    const snapshot = snapshotFrom(plan);
    const card = snapshot.documents.find((document) => document.path.endsWith('/cards/c1'));
    card!.data = { ...card!.data, verseText: 'Changed verse' };
    const report = classifications(plan, snapshot);
    expect(report.entries.find((entry) => entry.path === card?.path)?.classification).toBe('UPDATE');
  });

  it('classifies a stale card as DELETE', () => {
    const snapshot = snapshotFrom(plan);
    const stalePath = 'seasons/fixture-season/materialSets/cadet/cards/stale';
    snapshot.documents.push({ path: stalePath, data: { cardId: 'stale', verseText: 'Old' } });
    const report = classifications(plan, snapshot);
    expect(report.entries.find((entry) => entry.path === stalePath)?.classification).toBe('DELETE');
  });

  it('classifies a stale section as DELETE', () => {
    const snapshot = snapshotFrom(plan);
    const stalePath = 'seasons/fixture-season/materialSets/cadet/sections/stale';
    snapshot.documents.push({ path: stalePath, data: { sectionId: 'stale', title: 'Old' } });
    expect(classifications(plan, snapshot).entries.find((entry) => entry.path === stalePath)?.classification).toBe(
      'DELETE',
    );
  });

  it('classifies a stale material set as DELETE', () => {
    const snapshot = snapshotFrom(plan);
    const stalePath = 'seasons/fixture-season/materialSets/stale-set';
    snapshot.documents.push({
      path: stalePath,
      data: { materialSetId: 'stale-set', displayName: 'Old' },
    });
    expect(classifications(plan, snapshot).entries.find((entry) => entry.path === stalePath)?.classification).toBe(
      'DELETE',
    );
  });

  it('classifies a missing expected material set as CREATE', () => {
    const snapshot = snapshotFrom(plan);
    snapshot.documents = snapshot.documents.filter(
      (document) => !document.path.includes('/materialSets/experienced'),
    );
    const report = classifications(plan, snapshot);
    const materialSetPath = 'seasons/fixture-season/materialSets/experienced';
    expect(report.entries.find((entry) => entry.path === materialSetPath)?.classification).toBe('CREATE');
    expect(report.counts.CREATE).toBeGreaterThan(0);
  });

  it('reports no content changes when the fingerprint and tree match', () => {
    const report = classifications(plan, snapshotFrom(plan));
    expect(report.outcome).toBe('already-installed');
    expect(report.contentMatches).toBe(true);
    expect(formatDevDiff(report)).toContain(ALREADY_INSTALLED_OUTPUT);
  });

  it('reports drift when the fingerprint matches but a card differs', () => {
    const snapshot = snapshotFrom(plan);
    const card = snapshot.documents.find((document) => document.path.endsWith('/materialSets/junior/cards/c1'));
    card!.data = { ...card!.data, verseText: 'Drifted' };
    const report = classifications(plan, snapshot);
    expect(report.fingerprintMatches).toBe(true);
    expect(report.outcome).toBe('fingerprint-drift');
    expect(formatDevDiff(report)).toContain(FINGERPRINT_DRIFT_OUTPUT);
    expect(report.entries.find((entry) => entry.path === card?.path)?.classification).toBe('UPDATE');
  });

  it('reports drift when the fingerprint matches but a stale card remains', () => {
    const snapshot = snapshotFrom(plan);
    const stalePath = 'seasons/fixture-season/materialSets/junior/cards/extra';
    snapshot.documents.push({ path: stalePath, data: { cardId: 'extra' } });
    const report = classifications(plan, snapshot);
    expect(report.outcome).toBe('fingerprint-drift');
    expect(report.entries.find((entry) => entry.path === stalePath)?.classification).toBe('DELETE');
  });

  it('diffs partial differences when the fingerprint differs', () => {
    const snapshot = snapshotFrom(plan, 'installed-fingerprint');
    const card = snapshot.documents.find((document) => document.path.endsWith('/materialSets/cadet/cards/c1'));
    card!.data = { ...card!.data, reference: 'Changed 1:1' };
    const report = classifications(plan, snapshot);
    expect(report.fingerprintMatches).toBe(false);
    expect(report.outcome).toBe('differences');
    expect(report.entries.find((entry) => entry.path === card?.path)?.classification).toBe('UPDATE');
    expect(report.counts.UNCHANGED).toBe(plan.documents.length - 1);
  });

  it('ignores documents outside this season curriculum tree', () => {
    const snapshot = snapshotFrom(plan);
    snapshot.documents.push({ path: 'users/quizzer-1', data: { name: 'hidden' } });
    snapshot.documents.push({
      path: 'seasons/other-season/materialSets/cadet',
      data: { materialSetId: 'cadet' },
    });
    const report = classifications(plan, snapshot);
    expect(report.entries.some((entry) => entry.path.startsWith('users/'))).toBe(false);
    expect(report.entries.some((entry) => entry.path.includes('other-season'))).toBe(false);
    expect(report.counts.DELETE).toBe(0);
  });
});
