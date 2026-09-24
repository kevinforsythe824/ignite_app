import { canonicalize } from '../content-pipeline/fingerprint';
import { classifyCurriculumPath } from './paths';
import type {
  CurriculumDiffEntry,
  CurriculumDiffReport,
  DiffClassification,
  ImportPlan,
  PlannedDocument,
  SeasonCurriculumSnapshot,
} from './types';

const AUTHORITATIVE_FIELDS = {
  season: [
    'seasonId',
    'name',
    'startDate',
    'endDate',
    'status',
    'sourceMaterialReleaseDate',
    'igniteAvailabilityDate',
  ],
  materialSet: ['seasonId', 'materialSetId', 'divisionId', 'displayName'],
  section: [
    'seasonId',
    'materialSetId',
    'sectionId',
    'title',
    'description',
    'displayOrder',
    'cardIds',
  ],
  card: [
    'seasonId',
    'materialSetId',
    'cardId',
    'cardNumber',
    'reference',
    'verseText',
    'sectionId',
    'indexCode',
    'tags',
    'quizMetadata',
    'crossReferences',
    'annotations',
  ],
} as const;

/**
 * Package identity that participates in season equality.
 * Fingerprint stays on the document and in the diff outcome, but a fingerprint-only
 * change must not classify the season as a curriculum UPDATE.
 * converterVersion, importerVersion, environment, importedAt, and importStatus
 * are operational and are not compared.
 */
const PROVENANCE_EQUALITY_FIELDS = ['schemaVersion', 'sourceVersion'] as const;

function definedFields(fields: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function projectAnnotations(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }
  return value.map((item) => {
    const record = asRecord(item);
    if (!record) {
      return item;
    }
    const sourceTarget = asRecord(record.sourceTarget);
    const resolvedTarget = asRecord(record.resolvedTarget);
    return definedFields({
      annotationId: record.annotationId,
      cardId: record.cardId,
      type: record.type,
      sourceTarget: sourceTarget
        ? definedFields({
            strategy: sourceTarget.strategy,
            phrase: sourceTarget.phrase,
            occurrenceIndex: sourceTarget.occurrenceIndex,
          })
        : record.sourceTarget,
      resolvedTarget: resolvedTarget
        ? definedFields({
            start: resolvedTarget.start,
            end: resolvedTarget.end,
          })
        : record.resolvedTarget,
      notes: record.notes,
    });
  });
}

function projectQuizMetadata(value: unknown): unknown {
  const record = asRecord(value);
  if (!record) {
    return value;
  }
  return definedFields({
    pointValue: record.pointValue,
    questionHint: record.questionHint,
  });
}

function projectCrossReferences(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }
  return value.map((item) => {
    const record = asRecord(item);
    if (!record) {
      return item;
    }
    return definedFields({
      fromCardId: record.fromCardId,
      toReference: record.toReference,
      toCardId: record.toCardId,
      notes: record.notes,
    });
  });
}

function projectProvenanceForEquality(value: unknown): Record<string, unknown> | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }
  const projected: Record<string, unknown> = {};
  for (const field of PROVENANCE_EQUALITY_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(record, field)) {
      continue;
    }
    const fieldValue = record[field];
    if (fieldValue === undefined) {
      continue;
    }
    projected[field] = fieldValue;
  }
  return projected;
}

function projectField(field: string, value: unknown): unknown {
  if (field === 'annotations') {
    return projectAnnotations(value);
  }
  if (field === 'quizMetadata') {
    return projectQuizMetadata(value);
  }
  if (field === 'crossReferences') {
    return projectCrossReferences(value);
  }
  return value;
}

function projectAuthoritative(document: PlannedDocument): Record<string, unknown> {
  const projected: Record<string, unknown> = {};
  for (const field of AUTHORITATIVE_FIELDS[document.kind]) {
    if (!Object.prototype.hasOwnProperty.call(document.data, field)) {
      continue;
    }
    const value = document.data[field];
    if (value === undefined) {
      continue;
    }
    projected[field] = projectField(field, value);
  }
  if (document.kind === 'season') {
    const provenance = projectProvenanceForEquality(document.data.provenance);
    if (provenance) {
      projected.provenance = provenance;
    }
  }
  return projected;
}

function projectActual(
  document: PlannedDocument,
  actual: Record<string, unknown>,
): Record<string, unknown> {
  const projected: Record<string, unknown> = {};
  for (const field of AUTHORITATIVE_FIELDS[document.kind]) {
    if (!Object.prototype.hasOwnProperty.call(actual, field)) {
      continue;
    }
    const value = actual[field];
    if (value === undefined) {
      continue;
    }
    projected[field] = projectField(field, value);
  }
  if (document.kind === 'season') {
    const provenance = projectProvenanceForEquality(actual.provenance);
    if (provenance) {
      projected.provenance = provenance;
    }
  }
  return projected;
}

function authoritativeEquals(
  expected: PlannedDocument,
  actual: Record<string, unknown>,
): boolean {
  return canonicalize(projectAuthoritative(expected)) === canonicalize(projectActual(expected, actual));
}

function emptyCounts(): Record<DiffClassification, number> {
  return { CREATE: 0, UPDATE: 0, UNCHANGED: 0, DELETE: 0 };
}

function readInstalledFingerprint(
  snapshot: SeasonCurriculumSnapshot,
  seasonPath: string,
): string | null {
  const season = snapshot.documents.find((document) => document.path === seasonPath);
  const provenance = asRecord(season?.data.provenance);
  const fingerprint = provenance?.fingerprint;
  return typeof fingerprint === 'string' && fingerprint.length > 0 ? fingerprint : null;
}

/** Pure comparison of an expected plan to an in-memory season snapshot. */
export function diffCurriculum(
  plan: ImportPlan,
  snapshot: SeasonCurriculumSnapshot,
): CurriculumDiffReport {
  const actualByPath: Record<string, Record<string, unknown>> = {};
  for (const document of snapshot.documents) {
    if (classifyCurriculumPath(plan.seasonId, document.path)) {
      actualByPath[document.path] = document.data;
    }
  }

  const expectedPaths = new Set<string>();
  const entries: CurriculumDiffEntry[] = [];

  for (const expected of plan.documents) {
    expectedPaths.add(expected.path);
    const actual = actualByPath[expected.path];
    if (!actual) {
      entries.push({ path: expected.path, kind: expected.kind, classification: 'CREATE' });
      continue;
    }
    entries.push({
      path: expected.path,
      kind: expected.kind,
      classification: authoritativeEquals(expected, actual) ? 'UNCHANGED' : 'UPDATE',
    });
  }

  const stale = Object.keys(actualByPath)
    .filter((path) => !expectedPaths.has(path))
    .sort((left, right) => left.localeCompare(right));
  for (const path of stale) {
    const kind = classifyCurriculumPath(plan.seasonId, path);
    if (!kind) {
      continue;
    }
    entries.push({ path, kind, classification: 'DELETE' });
  }

  const counts = emptyCounts();
  for (const entry of entries) {
    counts[entry.classification] += 1;
  }

  const seasonPath = plan.documents.find((document) => document.kind === 'season')?.path;
  const installedFingerprint = seasonPath
    ? readInstalledFingerprint(snapshot, seasonPath)
    : null;
  const fingerprintMatches = installedFingerprint === plan.fingerprint;
  const contentMatches = counts.CREATE === 0 && counts.UPDATE === 0 && counts.DELETE === 0;
  const outcome = fingerprintMatches
    ? contentMatches
      ? 'already-installed'
      : 'fingerprint-drift'
    : 'differences';

  return {
    seasonId: plan.seasonId,
    packageFingerprint: plan.fingerprint,
    installedFingerprint,
    entries,
    counts,
    fingerprintMatches,
    contentMatches,
    outcome,
  };
}
