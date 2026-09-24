import { diffCurriculum } from './diffPlan';
import { classifyCurriculumPath } from './paths';
import { serializeCurriculumDocument } from './serializeCurriculumDocument';
import {
  CONTENT_IMPORTER_VERSION,
  IMPORT_PLAN_RUNTIME_PLACEHOLDER,
  IMPORT_STATUS_COMPLETE,
  IMPORT_STATUS_IMPORTING,
} from './constants';
import type {
  CurriculumDiffReport,
  CurriculumWritePort,
  DiffClassification,
  ImportPlan,
  PlannedDocument,
  SeasonCurriculumSnapshot,
} from './types';

export type ApplyReplacementOutcome = 'already-installed' | 'applied';

export interface ApplyReplacementInput {
  plan: ImportPlan;
  snapshot: SeasonCurriculumSnapshot;
  report?: CurriculumDiffReport;
  port: CurriculumWritePort;
  now: () => string;
  environment: 'dev';
  importerVersion?: string;
}

const REMOVAL_ORDER = ['card', 'section', 'materialSet'] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function requireProvenanceString(provenance: Record<string, unknown>, key: string): string {
  const value = provenance[key];
  if (typeof value !== 'string' || value.length === 0 || value === IMPORT_PLAN_RUNTIME_PLACEHOLDER) {
    throw new Error(`Season provenance is missing a durable ${key}.`);
  }
  return value;
}

function seasonDocument(plan: ImportPlan): PlannedDocument {
  const season = plan.documents.find((document) => document.kind === 'season');
  if (!season) {
    throw new Error(`Import plan for ${plan.seasonId} has no season document.`);
  }
  return season;
}

function readStoredImportStatus(snapshot: SeasonCurriculumSnapshot, seasonPath: string): string | null {
  const season = snapshot.documents.find((document) => document.path === seasonPath);
  const provenance = asRecord(season?.data.provenance);
  const importStatus = provenance?.importStatus;
  return typeof importStatus === 'string' ? importStatus : null;
}

function assertOwnedPath(seasonId: string, documentPath: string): void {
  if (!classifyCurriculumPath(seasonId, documentPath)) {
    throw new Error(`Refusing curriculum path outside season ${seasonId}: ${documentPath}`);
  }
}

function documentsFor(
  plan: ImportPlan,
  report: CurriculumDiffReport,
  kinds: readonly PlannedDocument['kind'][],
  classifications: readonly DiffClassification[],
): PlannedDocument[] {
  const wanted = new Set(
    report.entries
      .filter((entry) => kinds.includes(entry.kind) && classifications.includes(entry.classification))
      .map((entry) => entry.path),
  );
  return plan.documents.filter((document) => wanted.has(document.path));
}

function removalPaths(plan: ImportPlan, report: CurriculumDiffReport): string[] {
  const paths: string[] = [];
  for (const kind of REMOVAL_ORDER) {
    const matches = report.entries
      .filter((entry) => entry.classification === 'DELETE' && entry.kind === kind)
      .map((entry) => entry.path);
    paths.push(...matches);
  }
  for (const documentPath of paths) {
    assertOwnedPath(plan.seasonId, documentPath);
  }
  return paths;
}

function seasonPayload(
  plan: ImportPlan,
  importStatus: typeof IMPORT_STATUS_IMPORTING | typeof IMPORT_STATUS_COMPLETE,
  importedAt: string,
  environment: 'dev',
  importerVersion: string,
): Record<string, unknown> {
  const season = seasonDocument(plan);
  const provenance = asRecord(season.data.provenance);
  if (!provenance) {
    throw new Error(`Season ${plan.seasonId} is missing provenance.`);
  }
  const { provenance: _ignored, ...curriculum } = season.data;
  return serializeCurriculumDocument({
    ...curriculum,
    provenance: {
      schemaVersion: requireProvenanceString(provenance, 'schemaVersion'),
      sourceVersion: requireProvenanceString(provenance, 'sourceVersion'),
      fingerprint: requireProvenanceString(provenance, 'fingerprint'),
      converterVersion: requireProvenanceString(provenance, 'converterVersion'),
      importerVersion,
      environment,
      importedAt,
      importStatus,
    },
  });
}

/**
 * In-memory apply order. Does not open Firebase.
 * A missing MaterialSet parent with orphaned subcollections cannot be discovered
 * by the existing reader; this orchestrator does not scan collection groups.
 */
export async function applyReplacement(input: ApplyReplacementInput): Promise<ApplyReplacementOutcome> {
  if (input.environment !== 'dev') {
    throw new Error('Content import apply is DEV-only.');
  }

  const report = diffCurriculum(input.plan, input.snapshot);
  if (input.report && input.report.seasonId !== input.plan.seasonId) {
    throw new Error(`Diff report season ${input.report.seasonId} does not match plan ${input.plan.seasonId}.`);
  }

  const season = seasonDocument(input.plan);
  assertOwnedPath(input.plan.seasonId, season.path);
  const storedStatus = readStoredImportStatus(input.snapshot, season.path);
  if (report.fingerprintMatches && report.contentMatches && storedStatus === IMPORT_STATUS_COMPLETE) {
    return 'already-installed';
  }

  const materialSets = documentsFor(input.plan, report, ['materialSet'], ['CREATE', 'UPDATE']);
  const sections = documentsFor(input.plan, report, ['section'], ['CREATE', 'UPDATE']);
  const cards = documentsFor(input.plan, report, ['card'], ['CREATE', 'UPDATE']);
  const removals = removalPaths(input.plan, report);
  for (const document of [...materialSets, ...sections, ...cards]) {
    assertOwnedPath(input.plan.seasonId, document.path);
  }

  const importedAt = input.now();
  const importerVersion = input.importerVersion ?? CONTENT_IMPORTER_VERSION;
  const environment = input.environment;

  await input.port.upsert(
    season.path,
    seasonPayload(input.plan, IMPORT_STATUS_IMPORTING, importedAt, environment, importerVersion),
  );

  for (const document of materialSets) {
    await input.port.upsert(document.path, serializeCurriculumDocument(document.data));
  }
  for (const document of sections) {
    await input.port.upsert(document.path, serializeCurriculumDocument(document.data));
  }
  for (const document of cards) {
    await input.port.upsert(document.path, serializeCurriculumDocument(document.data));
  }
  for (const documentPath of removals) {
    await input.port.remove(documentPath);
  }

  await input.port.upsert(
    season.path,
    seasonPayload(input.plan, IMPORT_STATUS_COMPLETE, importedAt, environment, importerVersion),
  );
  return 'applied';
}
