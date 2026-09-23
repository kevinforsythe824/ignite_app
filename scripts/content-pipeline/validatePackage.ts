import { makeCardKey } from '../../src/features/flashcards/domain/card';
import {
  assertCurriculumSectionInvariants,
  CurriculumSectionInvariantError,
} from '../../src/features/season/domain/curriculumSection';
import { isDivisionId, OFFICIAL_DIVISION_IDS } from '../../src/features/season/domain/division';
import { SEASON_STATUSES } from '../../src/features/season/domain/season';
import {
  CONTENT_SCHEMA_VERSION,
  isSupportedContentSchemaVersion,
  isSyntheticAnnotationType,
  PHRASE_OCCURRENCE_STRATEGY,
} from './constants';
import { issue } from './errors';
import { annotationLogicalKey } from './identifiers';
import { resolveAnnotationTarget } from './resolveAnnotationTarget';
import { seasonIdSegmentIssue } from './seasonIdPath';
import type { ContentPackage, ValidationIssue } from './types';

/**
 * Package/domain validation is independent of workbook parsing.
 * Reuses Phase 1 helpers; does not expand isSeasonSelectable into routing.
 */
export function validateContentPackage(content: ContentPackage): ValidationIssue[] {
  const errors: ValidationIssue[] = [];

  if (!isSupportedContentSchemaVersion(content.schemaVersion)) {
    errors.push(
      issue({
        code: 'unsupported_schema_version',
        field: 'schemaVersion',
        reason: `Unsupported package schemaVersion "${content.schemaVersion}". Expected ${CONTENT_SCHEMA_VERSION}.`,
      }),
    );
  }

  if (!content.sourceVersion) {
    errors.push(
      issue({
        code: 'missing_required_field',
        field: 'sourceVersion',
        reason: 'Package sourceVersion is required.',
      }),
    );
  }

  const season = content.season;
  if (!season.seasonId) {
    errors.push(
      issue({
        code: 'missing_required_field',
        field: 'seasonId',
        reason: 'Season ID is required.',
      }),
    );
  } else {
    const unsafeSeasonId = seasonIdSegmentIssue(season.seasonId);
    if (unsafeSeasonId) {
      errors.push(unsafeSeasonId);
    }
  }
  if (!season.name) {
    errors.push(
      issue({
        code: 'missing_required_field',
        field: 'name',
        reason: 'Season name is required.',
      }),
    );
  }
  if (!(SEASON_STATUSES as readonly string[]).includes(season.status)) {
    errors.push(
      issue({
        code: 'invalid_season_status',
        field: 'status',
        reason: `Unknown season status "${String(season.status)}".`,
      }),
    );
  }

  if (content.materialSets.length !== OFFICIAL_DIVISION_IDS.length) {
    errors.push(
      issue({
        code: 'material_set_count',
        reason: `A season package must contain exactly ${OFFICIAL_DIVISION_IDS.length} independent MaterialSets; found ${content.materialSets.length}.`,
      }),
    );
  }

  const seenMaterialSetIds = new Set<string>();
  const seenDivisions = new Set<string>();
  const seenCardKeys = new Set<string>();

  for (const materialSet of content.materialSets) {
    if (materialSet.seasonId !== season.seasonId) {
      errors.push(
        issue({
          code: 'season_id_mismatch',
          field: 'seasonId',
          reason: `MaterialSet "${materialSet.materialSetId}" seasonId does not match package season.`,
        }),
      );
    }

    if (!materialSet.materialSetId) {
      errors.push(
        issue({
          code: 'missing_required_field',
          field: 'materialSetId',
          reason: 'MaterialSet ID is required.',
        }),
      );
    } else if (seenMaterialSetIds.has(materialSet.materialSetId)) {
      errors.push(
        issue({
          code: 'duplicate_material_set_id',
          field: 'materialSetId',
          reason: `Duplicate materialSetId "${materialSet.materialSetId}".`,
        }),
      );
    } else {
      seenMaterialSetIds.add(materialSet.materialSetId);
    }

    if (!isDivisionId(materialSet.divisionId)) {
      errors.push(
        issue({
          code: 'invalid_division_id',
          field: 'divisionId',
          reason: `MaterialSet "${materialSet.materialSetId}" has invalid divisionId "${String(materialSet.divisionId)}".`,
        }),
      );
    } else if (seenDivisions.has(materialSet.divisionId)) {
      errors.push(
        issue({
          code: 'material_set_division_mismatch',
          field: 'divisionId',
          reason: `Division "${materialSet.divisionId}" is associated with more than one MaterialSet.`,
        }),
      );
    } else {
      seenDivisions.add(materialSet.divisionId);
    }

    if ('parentMaterialSetId' in materialSet) {
      errors.push(
        issue({
          code: 'material_set_not_independent',
          field: 'parentMaterialSetId',
          reason: 'MaterialSets must be independent; parentMaterialSetId is not allowed.',
        }),
      );
    }

    const cardIds = new Set<string>();
    const cardNumbers = new Set<number>();

    for (const card of materialSet.cards) {
      if (card.seasonId !== season.seasonId || card.materialSetId !== materialSet.materialSetId) {
        errors.push(
          issue({
            code: 'card_ownership_mismatch',
            field: 'cardId',
            reason: `Card "${card.cardId}" does not belong to MaterialSet "${materialSet.materialSetId}".`,
          }),
        );
      }

      if (!card.cardId) {
        errors.push(
          issue({
            code: 'missing_required_field',
            field: 'cardId',
            reason: 'cardId is required on generated cards.',
          }),
        );
      } else if (cardIds.has(card.cardId)) {
        errors.push(
          issue({
            code: 'duplicate_card_id',
            field: 'cardId',
            reason: `Duplicate cardId "${card.cardId}" within MaterialSet "${materialSet.materialSetId}".`,
          }),
        );
      } else {
        cardIds.add(card.cardId);
      }

      if (!Number.isInteger(card.cardNumber)) {
        errors.push(
          issue({
            code: 'invalid_card_number',
            field: 'cardNumber',
            reason: `Card "${card.cardId}" is missing a valid cardNumber.`,
          }),
        );
      } else if (cardNumbers.has(card.cardNumber)) {
        errors.push(
          issue({
            code: 'duplicate_card_number',
            field: 'cardNumber',
            reason: `Duplicate card number ${card.cardNumber} within MaterialSet "${materialSet.materialSetId}".`,
          }),
        );
      } else {
        cardNumbers.add(card.cardNumber);
      }

      if (!card.reference) {
        errors.push(
          issue({
            code: 'missing_required_field',
            field: 'reference',
            reason: `Card "${card.cardId}" is missing a Scripture reference.`,
          }),
        );
      }
      if (!card.verseText) {
        errors.push(
          issue({
            code: 'missing_required_field',
            field: 'verseText',
            reason: `Card "${card.cardId}" is missing Scripture text.`,
          }),
        );
      }

      const cardKey = makeCardKey(card.seasonId, card.materialSetId, card.cardId);
      if (seenCardKeys.has(cardKey)) {
        errors.push(
          issue({
            code: 'duplicate_card_key',
            field: 'cardId',
            reason: `Duplicate canonical card identity "${cardKey}".`,
          }),
        );
      } else {
        seenCardKeys.add(cardKey);
      }

      const sectionIds = new Set(materialSet.sections.map((section) => section.sectionId));
      if (!card.sectionId || !sectionIds.has(card.sectionId)) {
        errors.push(
          issue({
            code: 'invalid_section',
            field: 'sectionId',
            reason: `Card "${card.cardId}" sectionId "${card.sectionId}" is not in MaterialSet "${materialSet.materialSetId}".`,
          }),
        );
      }

      const seenAnnotationIds = new Set<string>();
      const seenLogicalAnnotations = new Set<string>();
      for (const annotation of card.annotations) {
        if (seenAnnotationIds.has(annotation.annotationId)) {
          errors.push(
            issue({
              code: 'duplicate_annotation_id',
              field: 'annotationId',
              reason: `Card "${card.cardId}" has duplicate annotationId "${annotation.annotationId}".`,
            }),
          );
        } else {
          seenAnnotationIds.add(annotation.annotationId);
        }

        if (annotation.sourceTarget.strategy === PHRASE_OCCURRENCE_STRATEGY) {
          const logicalKey = annotationLogicalKey({
            type: annotation.type,
            strategy: annotation.sourceTarget.strategy,
            phrase: annotation.sourceTarget.phrase,
            occurrenceIndex: annotation.sourceTarget.occurrenceIndex,
          });
          if (seenLogicalAnnotations.has(logicalKey)) {
            errors.push(
              issue({
                code: 'duplicate_annotation',
                field: 'phrase',
                reason: `Card "${card.cardId}" has a duplicate ${annotation.type} annotation for phrase "${annotation.sourceTarget.phrase}" at occurrence ${annotation.sourceTarget.occurrenceIndex}.`,
              }),
            );
          } else {
            seenLogicalAnnotations.add(logicalKey);
          }
        }

        if (!isSyntheticAnnotationType(annotation.type)) {
          errors.push(
            issue({
              code: 'unsupported_annotation_type',
              field: 'type',
              reason: `Card "${card.cardId}" has unsupported annotation type "${String(annotation.type)}".`,
            }),
          );
        }
        if (annotation.sourceTarget.strategy !== PHRASE_OCCURRENCE_STRATEGY) {
          errors.push(
            issue({
              code: 'unsupported_annotation_strategy',
              field: 'strategy',
              reason: `Card "${card.cardId}" has unsupported annotation strategy.`,
            }),
          );
          continue;
        }
        const resolved = resolveAnnotationTarget({
          verseText: card.verseText,
          sourceTarget: annotation.sourceTarget,
        });
        if (resolved.error) {
          errors.push({
            ...resolved.error,
            reason: `Card "${card.cardId}" annotation "${annotation.annotationId}": ${resolved.error.reason}`,
          });
        } else if (
          !resolved.resolved ||
          resolved.resolved.start !== annotation.resolvedTarget.start ||
          resolved.resolved.end !== annotation.resolvedTarget.end
        ) {
          errors.push(
            issue({
              code: 'invalid_annotation_target',
              field: 'resolvedTarget',
              reason: `Card "${card.cardId}" annotation "${annotation.annotationId}" resolved span does not match the verse text.`,
            }),
          );
        }
      }
    }

    const membership = new Set<string>();
    for (const section of materialSet.sections) {
      if (section.seasonId !== season.seasonId || section.materialSetId !== materialSet.materialSetId) {
        errors.push(
          issue({
            code: 'section_ownership_mismatch',
            field: 'sectionId',
            reason: `Section "${section.sectionId}" does not belong to MaterialSet "${materialSet.materialSetId}".`,
          }),
        );
      }
      for (const cardId of section.cardIds) {
        membership.add(cardId);
      }
    }

    for (const card of materialSet.cards) {
      if (!membership.has(card.cardId)) {
        errors.push(
          issue({
            code: 'orphan_card',
            field: 'cardId',
            reason: `Card "${card.cardId}" is not a member of any CurriculumSection.`,
          }),
        );
      }
    }

    try {
      assertCurriculumSectionInvariants(
        materialSet.sections,
        new Set(materialSet.cards.map((card) => card.cardId)),
      );
    } catch (error) {
      if (error instanceof CurriculumSectionInvariantError) {
        errors.push(
          issue({
            code: 'section_invariant',
            reason: error.message,
          }),
        );
      } else {
        throw error;
      }
    }
  }

  for (const divisionId of OFFICIAL_DIVISION_IDS) {
    if (!seenDivisions.has(divisionId) && content.materialSets.length === OFFICIAL_DIVISION_IDS.length) {
      errors.push(
        issue({
          code: 'missing_division_material_set',
          field: 'divisionId',
          reason: `Season package is missing a MaterialSet for division "${divisionId}".`,
        }),
      );
    }
  }

  return errors;
}
