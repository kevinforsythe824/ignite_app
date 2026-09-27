import type { CurriculumSection } from '../../season/domain/curriculumSection';
import { throwInvalidCurriculumDocument } from './mapFirestoreToCard';

export interface FirestoreSectionSnapshot {
  sectionId: string;
  data: unknown;
}

function fail(
  field: string,
  reason: string,
  seasonId: string,
  sectionId: string,
): never {
  throwInvalidCurriculumDocument(field, reason, seasonId, sectionId, 'section');
}

function requireExactIdentity(
  value: unknown,
  expected: string,
  field: string,
  seasonId: string,
  sectionId: string,
): void {
  if (typeof value !== 'string' || value.length === 0) {
    fail(field, 'must be a non-empty string', seasonId, sectionId);
  }
  if (value !== expected) {
    fail(field, `must equal "${expected}"`, seasonId, sectionId);
  }
}

function requireTitle(value: unknown, seasonId: string, sectionId: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail('title', 'must be a non-empty string', seasonId, sectionId);
  }
  return value.trim();
}

function requireCardIds(value: unknown, seasonId: string, sectionId: string): string[] {
  if (!Array.isArray(value)) {
    fail('cardIds', 'must be an array of strings', seasonId, sectionId);
  }
  return value.map((cardId) => {
    if (typeof cardId !== 'string' || cardId.length === 0) {
      fail('cardIds', 'must be an array of non-empty strings', seasonId, sectionId);
    }
    return cardId;
  });
}

/**
 * Maps one nested Section document to CurriculumSection.
 * Identity fields must match the requested Season, MaterialSet, and document id.
 */
export function mapFirestoreSectionToDomain(
  document: unknown,
  seasonId: string,
  materialSetId: string,
  sectionId: string,
): CurriculumSection {
  if (typeof seasonId !== 'string' || seasonId.trim().length === 0) {
    throwInvalidCurriculumDocument('seasonId', 'must be a non-empty string');
  }
  if (typeof materialSetId !== 'string' || materialSetId.trim().length === 0) {
    throwInvalidCurriculumDocument('materialSetId', 'must be a non-empty string', seasonId);
  }
  if (typeof sectionId !== 'string' || sectionId.trim().length === 0) {
    throwInvalidCurriculumDocument('sectionId', 'must be a non-empty string', seasonId);
  }

  const resolvedSeasonId = seasonId.trim();
  const resolvedMaterialSetId = materialSetId.trim();
  const resolvedSectionId = sectionId.trim();

  if (document === null || typeof document !== 'object' || Array.isArray(document)) {
    fail('document', 'must be an object', resolvedSeasonId, resolvedSectionId);
  }

  const data = document as Record<string, unknown>;
  requireExactIdentity(
    data.seasonId,
    resolvedSeasonId,
    'seasonId',
    resolvedSeasonId,
    resolvedSectionId,
  );
  requireExactIdentity(
    data.materialSetId,
    resolvedMaterialSetId,
    'materialSetId',
    resolvedSeasonId,
    resolvedSectionId,
  );
  requireExactIdentity(
    data.sectionId,
    resolvedSectionId,
    'sectionId',
    resolvedSeasonId,
    resolvedSectionId,
  );

  if (typeof data.displayOrder !== 'number' || !Number.isInteger(data.displayOrder)) {
    fail('displayOrder', 'must be an integer', resolvedSeasonId, resolvedSectionId);
  }

  const section: CurriculumSection = {
    seasonId: resolvedSeasonId,
    materialSetId: resolvedMaterialSetId,
    sectionId: resolvedSectionId,
    title: requireTitle(data.title, resolvedSeasonId, resolvedSectionId),
    displayOrder: data.displayOrder,
    cardIds: requireCardIds(data.cardIds, resolvedSeasonId, resolvedSectionId),
  };

  if ('description' in data && data.description !== undefined) {
    if (typeof data.description !== 'string') {
      fail('description', 'must be a string', resolvedSeasonId, resolvedSectionId);
    }
    const description = data.description.trim();
    if (description.length > 0) {
      section.description = description;
    }
  }

  return section;
}
