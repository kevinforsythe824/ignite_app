import { throwInvalidCurriculumDocument } from './mapFirestoreToCard';

function fail(
  field: string,
  reason: string,
  seasonId: string,
  materialSetId: string,
): never {
  throwInvalidCurriculumDocument(field, reason, seasonId, materialSetId, 'materialSet');
}

function requireExactIdentity(
  value: unknown,
  expected: string,
  field: string,
  seasonId: string,
  materialSetId: string,
): void {
  if (typeof value !== 'string' || value.length === 0) {
    fail(field, 'must be a non-empty string', seasonId, materialSetId);
  }
  if (value !== expected) {
    fail(field, `must equal "${expected}"`, seasonId, materialSetId);
  }
}

/**
 * Reads MaterialSet displayName for StudyCurriculum.title.
 * Does not copy provenance. Does not accept a Season title fallback.
 */
export function readMaterialSetDisplayName(
  document: unknown,
  seasonId: string,
  materialSetId: string,
): string {
  if (typeof seasonId !== 'string' || seasonId.trim().length === 0) {
    throwInvalidCurriculumDocument('seasonId', 'must be a non-empty string');
  }
  if (typeof materialSetId !== 'string' || materialSetId.trim().length === 0) {
    throwInvalidCurriculumDocument('materialSetId', 'must be a non-empty string', seasonId);
  }

  const resolvedSeasonId = seasonId.trim();
  const resolvedMaterialSetId = materialSetId.trim();

  if (document === null || typeof document !== 'object' || Array.isArray(document)) {
    fail('document', 'must be an object', resolvedSeasonId, resolvedMaterialSetId);
  }

  const data = document as Record<string, unknown>;
  requireExactIdentity(
    data.seasonId,
    resolvedSeasonId,
    'seasonId',
    resolvedSeasonId,
    resolvedMaterialSetId,
  );
  requireExactIdentity(
    data.materialSetId,
    resolvedMaterialSetId,
    'materialSetId',
    resolvedSeasonId,
    resolvedMaterialSetId,
  );

  if (typeof data.displayName !== 'string' || data.displayName.trim().length === 0) {
    fail('displayName', 'must be a non-empty string', resolvedSeasonId, resolvedMaterialSetId);
  }

  return data.displayName.trim();
}
