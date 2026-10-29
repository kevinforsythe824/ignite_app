import { issue } from './errors';
import { fingerprintContent } from './fingerprint';
import type { ContentPackage, PackageManifest, ValidationIssue } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Rejects JSON that parsed but is not a content package document.
 * Field-level package rules stay in validateContentPackage.
 */
export function contentDocumentIssue(value: unknown): ValidationIssue | undefined {
  if (!isRecord(value)) {
    return issue({
      code: 'malformed_content',
      field: 'content.json',
      reason: 'content.json must be a JSON object.',
    });
  }
  if (!isRecord(value.season) || !Array.isArray(value.materialSets)) {
    return issue({
      code: 'malformed_content',
      field: 'content.json',
      reason: 'content.json is missing season or materialSets.',
    });
  }
  for (const materialSet of value.materialSets) {
    if (!isRecord(materialSet) || !Array.isArray(materialSet.sections) || !Array.isArray(materialSet.cards)) {
      return issue({
        code: 'malformed_content',
        field: 'materialSets',
        reason: 'A MaterialSet in content.json is missing sections or cards.',
      });
    }
    for (const section of materialSet.sections) {
      if (!isRecord(section) || !Array.isArray(section.cardIds)) {
        return issue({
          code: 'malformed_content',
          field: 'sections',
          reason: 'A Curriculum Section in content.json is missing cardIds.',
        });
      }
    }
    for (const card of materialSet.cards) {
      if (!isRecord(card) || !Array.isArray(card.annotations)) {
        return issue({
          code: 'malformed_content',
          field: 'cards',
          reason: 'A Card in content.json is missing annotations.',
        });
      }
      for (const annotation of card.annotations) {
        const nested = annotationRecordIssue(card, annotation);
        if (nested) {
          return nested;
        }
      }
    }
  }
  return undefined;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function annotationLocation(card: Record<string, unknown>, annotation: unknown): string {
  const cardId = typeof card.cardId === 'string' && card.cardId.length > 0 ? card.cardId : 'unknown';
  const annotationId =
    isRecord(annotation) && typeof annotation.annotationId === 'string' && annotation.annotationId.length > 0
      ? annotation.annotationId
      : 'unknown';
  return `Card "${cardId}" annotation "${annotationId}"`;
}

/**
 * Structural checks for one generated annotation.
 * Rejects values that would otherwise be passed into phrase and offset logic.
 * A missing occurrenceIndex is not a shape failure: package validation requires
 * the explicit index, while authoring may still omit it for one exact match.
 */
export function annotationRecordIssue(
  card: Record<string, unknown>,
  annotation: unknown,
): ValidationIssue | undefined {
  const where = annotationLocation(card, annotation);
  if (!isRecord(annotation)) {
    return issue({
      code: 'malformed_content',
      field: 'annotations',
      reason: `${where} must be an object.`,
    });
  }
  if (!isRecord(annotation.sourceTarget)) {
    return issue({
      code: 'malformed_content',
      field: 'sourceTarget',
      reason: `${where} is missing sourceTarget or sourceTarget is not an object.`,
    });
  }
  if (typeof annotation.sourceTarget.phrase !== 'string') {
    return issue({
      code: 'malformed_content',
      field: 'sourceTarget.phrase',
      reason: `${where} sourceTarget.phrase must be a string.`,
    });
  }
  if (!isRecord(annotation.resolvedTarget)) {
    return issue({
      code: 'malformed_content',
      field: 'resolvedTarget',
      reason: `${where} is missing resolvedTarget or resolvedTarget is not an object.`,
    });
  }
  if (!isNonNegativeInteger(annotation.resolvedTarget.start)) {
    return issue({
      code: 'malformed_content',
      field: 'resolvedTarget.start',
      reason: `${where} resolvedTarget.start must be a non-negative integer offset.`,
    });
  }
  if (!isNonNegativeInteger(annotation.resolvedTarget.end)) {
    return issue({
      code: 'malformed_content',
      field: 'resolvedTarget.end',
      reason: `${where} resolvedTarget.end must be a non-negative integer offset.`,
    });
  }
  return undefined;
}

function manifestShapeIssue(value: unknown): ValidationIssue | undefined {
  if (!isRecord(value)) {
    return issue({
      code: 'malformed_manifest',
      field: 'manifest.json',
      reason: 'manifest.json must be a JSON object.',
    });
  }
  const requiredStrings = ['schemaVersion', 'seasonId', 'sourceVersion', 'converterVersion', 'fingerprint', 'generatedAt'] as const;
  for (const field of requiredStrings) {
    if (typeof value[field] !== 'string' || value[field].length === 0) {
      return issue({
        code: 'malformed_manifest',
        field,
        reason: `manifest.json is missing a ${field} string.`,
      });
    }
  }
  if (value.validationStatus !== 'passed' && value.validationStatus !== 'failed') {
    return issue({
      code: 'malformed_manifest',
      field: 'validationStatus',
      reason: 'manifest.json validationStatus must be "passed" or "failed".',
    });
  }
  if (!Array.isArray(value.materialSets)) {
    return issue({
      code: 'malformed_manifest',
      field: 'materialSets',
      reason: 'manifest.json materialSets must be an array.',
    });
  }
  for (const entry of value.materialSets) {
    if (
      !isRecord(entry) ||
      typeof entry.materialSetId !== 'string' ||
      typeof entry.divisionId !== 'string' ||
      typeof entry.displayName !== 'string' ||
      typeof entry.sectionCount !== 'number' ||
      typeof entry.cardCount !== 'number' ||
      typeof entry.annotationCount !== 'number'
    ) {
      return issue({
        code: 'malformed_manifest',
        field: 'materialSets',
        reason: 'A manifest MaterialSet entry is missing its id, division, name, or counts.',
      });
    }
  }
  if (!isRecord(value.cardCounts) || typeof value.cardCounts.total !== 'number' || !isRecord(value.cardCounts.byMaterialSet)) {
    return issue({
      code: 'malformed_manifest',
      field: 'cardCounts',
      reason: 'manifest.json cardCounts must include a total and byMaterialSet counts.',
    });
  }
  for (const count of Object.values(value.cardCounts.byMaterialSet)) {
    if (typeof count !== 'number') {
      return issue({
        code: 'malformed_manifest',
        field: 'cardCounts.byMaterialSet',
        reason: 'manifest.json byMaterialSet counts must be numbers.',
      });
    }
  }
  return undefined;
}

/** Parses a manifest document. Shape failures stop before field comparison. */
export function readManifestDocument(
  value: unknown,
): { readonly manifest?: PackageManifest; readonly errors: readonly ValidationIssue[] } {
  const shape = manifestShapeIssue(value);
  if (shape) {
    return { errors: [shape] };
  }
  return { manifest: value as PackageManifest, errors: [] };
}

/**
 * Compares a well-shaped manifest to package content.
 * A matching fingerprint is not treated as proof that the other fields match.
 */
export function manifestConsistencyIssues(
  content: ContentPackage,
  manifest: PackageManifest,
): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  if (manifest.schemaVersion !== content.schemaVersion) {
    errors.push(
      issue({
        code: 'manifest_metadata_mismatch',
        field: 'schemaVersion',
        reason: `manifest schemaVersion "${manifest.schemaVersion}" does not match content schemaVersion "${content.schemaVersion}".`,
      }),
    );
  }
  if (manifest.seasonId !== content.season.seasonId) {
    errors.push(
      issue({
        code: 'manifest_metadata_mismatch',
        field: 'seasonId',
        reason: `manifest seasonId "${manifest.seasonId}" does not match content season "${content.season.seasonId}".`,
      }),
    );
  }
  if (manifest.sourceVersion !== content.sourceVersion) {
    errors.push(
      issue({
        code: 'manifest_metadata_mismatch',
        field: 'sourceVersion',
        reason: `manifest sourceVersion "${manifest.sourceVersion}" does not match content sourceVersion "${content.sourceVersion}".`,
      }),
    );
  }
  if (manifest.validationStatus !== 'passed') {
    errors.push(
      issue({
        code: 'manifest_metadata_mismatch',
        field: 'validationStatus',
        reason: 'manifest validationStatus must be "passed" for a package presented for validation.',
      }),
    );
  }

  const contentById = new Map(content.materialSets.map((materialSet) => [materialSet.materialSetId, materialSet]));
  const seen = new Set<string>();
  for (const entry of manifest.materialSets) {
    if (seen.has(entry.materialSetId)) {
      errors.push(
        issue({
          code: 'duplicate_manifest_material_set',
          field: 'materialSetId',
          reason: `manifest lists materialSetId "${entry.materialSetId}" more than once.`,
        }),
      );
      continue;
    }
    seen.add(entry.materialSetId);
    const materialSet = contentById.get(entry.materialSetId);
    if (!materialSet) {
      errors.push(
        issue({
          code: 'unexpected_manifest_material_set',
          field: 'materialSetId',
          reason: `manifest lists materialSetId "${entry.materialSetId}", which is not in the package.`,
        }),
      );
      continue;
    }
    if (entry.divisionId !== materialSet.divisionId) {
      errors.push(
        issue({
          code: 'manifest_material_set_mismatch',
          field: 'divisionId',
          reason: `manifest divisionId "${entry.divisionId}" for "${entry.materialSetId}" does not match content division "${materialSet.divisionId}".`,
        }),
      );
    }
    if (entry.displayName !== materialSet.displayName) {
      errors.push(
        issue({
          code: 'manifest_material_set_mismatch',
          field: 'displayName',
          reason: `manifest displayName for "${entry.materialSetId}" does not match the package.`,
        }),
      );
    }
    const annotationCount = materialSet.cards.reduce((sum, card) => sum + card.annotations.length, 0);
    if (entry.sectionCount !== materialSet.sections.length) {
      errors.push(
        issue({
          code: 'manifest_count_mismatch',
          field: 'sectionCount',
          reason: `manifest sectionCount ${entry.sectionCount} for "${entry.materialSetId}" does not match ${materialSet.sections.length} sections.`,
        }),
      );
    }
    if (entry.cardCount !== materialSet.cards.length) {
      errors.push(
        issue({
          code: 'manifest_count_mismatch',
          field: 'cardCount',
          reason: `manifest cardCount ${entry.cardCount} for "${entry.materialSetId}" does not match ${materialSet.cards.length} cards.`,
        }),
      );
    }
    if (entry.annotationCount !== annotationCount) {
      errors.push(
        issue({
          code: 'manifest_count_mismatch',
          field: 'annotationCount',
          reason: `manifest annotationCount ${entry.annotationCount} for "${entry.materialSetId}" does not match ${annotationCount} annotations.`,
        }),
      );
    }
  }

  for (const materialSet of content.materialSets) {
    if (!seen.has(materialSet.materialSetId)) {
      errors.push(
        issue({
          code: 'missing_manifest_material_set',
          field: 'materialSetId',
          reason: `manifest is missing materialSetId "${materialSet.materialSetId}".`,
        }),
      );
    }
  }

  const sameMembers =
    seen.size === content.materialSets.length &&
    manifest.materialSets.length === content.materialSets.length &&
    content.materialSets.every((materialSet) => seen.has(materialSet.materialSetId));
  if (
    sameMembers &&
    manifest.materialSets.some(
      (entry, index) => entry.materialSetId !== content.materialSets[index]?.materialSetId,
    )
  ) {
    errors.push(
      issue({
        code: 'manifest_material_set_mismatch',
        field: 'materialSets',
        reason: 'manifest MaterialSet order does not match the package.',
      }),
    );
  }

  const totalCards = content.materialSets.reduce((sum, materialSet) => sum + materialSet.cards.length, 0);
  if (manifest.cardCounts.total !== totalCards) {
    errors.push(
      issue({
        code: 'manifest_count_mismatch',
        field: 'cardCounts.total',
        reason: `manifest card total ${manifest.cardCounts.total} does not match ${totalCards} cards.`,
      }),
    );
  }
  for (const materialSet of content.materialSets) {
    if (manifest.cardCounts.byMaterialSet[materialSet.materialSetId] !== materialSet.cards.length) {
      errors.push(
        issue({
          code: 'manifest_count_mismatch',
          field: 'cardCounts.byMaterialSet',
          reason: `manifest card count for "${materialSet.materialSetId}" does not match ${materialSet.cards.length} cards.`,
        }),
      );
    }
  }
  for (const materialSetId of Object.keys(manifest.cardCounts.byMaterialSet)) {
    if (!contentById.has(materialSetId)) {
      errors.push(
        issue({
          code: 'unexpected_manifest_material_set',
          field: 'cardCounts.byMaterialSet',
          reason: `manifest card counts include unexpected materialSetId "${materialSetId}".`,
        }),
      );
    }
  }

  const expectedFingerprint = fingerprintContent(content);
  if (manifest.fingerprint !== expectedFingerprint) {
    errors.push(
      issue({
        code: 'fingerprint_mismatch',
        field: 'fingerprint',
        reason: 'manifest.json fingerprint does not match content.json.',
      }),
    );
  }

  return errors;
}
