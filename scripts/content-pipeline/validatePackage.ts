import { makeCardKey } from '../../src/features/flashcards/domain/card';
import {
  assertCurriculumSectionInvariants,
  CurriculumSectionInvariantError,
} from '../../src/features/season/domain/curriculumSection';
import { isDivisionId, OFFICIAL_DIVISION_IDS } from '../../src/features/season/domain/division';
import { isIsoCalendarDate } from '../../src/features/season/domain/isoCalendarDate';
import { SEASON_STATUSES } from '../../src/features/season/domain/season';
import {
  SUPPORTED_CONTENT_SCHEMA_VERSIONS,
  isSupportedContentSchemaVersion,
  isSyntheticAnnotationType,
  PHRASE_OCCURRENCE_STRATEGY,
} from './constants';
import { issue } from './errors';
import { frequencyTierIssues } from './frequencyTierValidation';
import { annotationLogicalKey } from './identifiers';
import { resolveAnnotationTarget } from './resolveAnnotationTarget';
import { seasonIdSegmentIssue } from './seasonIdPath';
import { studyContextIssues } from './studyContextValidation';
import type { ContentPackage, ValidationIssue } from './types';
import { annotationRecordIssue } from './validateManifest';

const ISO_DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

export interface ContentPackageValidationOptions {
  /**
   * Default true. A complete season package must include every official division.
   * The importer uses that default, so a partial draft cannot be loaded for apply.
   * Passing validation does not start an import. Local inspection of an
   * intentionally incomplete profile passes false.
   */
  requireAllOfficialDivisions?: boolean;
}

/**
 * Package/domain validation is independent of workbook parsing.
 * Reuses Phase 1 helpers; does not expand isSeasonSelectable into routing.
 */
export function validateContentPackage(
  content: ContentPackage,
  options: ContentPackageValidationOptions = {},
): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  const requireAllOfficialDivisions = options.requireAllOfficialDivisions !== false;

  if (!isSupportedContentSchemaVersion(content.schemaVersion)) {
    errors.push(
      issue({
        code: 'unsupported_schema_version',
        field: 'schemaVersion',
        reason: `Unsupported package schemaVersion "${String(content.schemaVersion)}". Supported versions: ${SUPPORTED_CONTENT_SCHEMA_VERSIONS.join(', ')}.`,
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

  errors.push(...packageSeasonDateIssues(season));

  if (requireAllOfficialDivisions && content.materialSets.length !== OFFICIAL_DIVISION_IDS.length) {
    errors.push(
      issue({
        code: 'material_set_count',
        reason: `A season package must contain exactly ${OFFICIAL_DIVISION_IDS.length} independent MaterialSets; found ${content.materialSets.length}.`,
      }),
    );
  } else if (!requireAllOfficialDivisions && content.materialSets.length === 0) {
    errors.push(
      issue({
        code: 'material_set_count',
        reason: 'A package must contain at least one MaterialSet.',
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
      const verseTextIssue = cardVerseTextIssue(card.cardId, card.verseText);
      if (verseTextIssue) {
        errors.push(verseTextIssue);
      }

      errors.push(
        ...studyContextIssues(card.studyContext, {
          cardId: card.cardId,
        }),
      );

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
        const shapeIssue = annotationRecordIssue({ cardId: card.cardId }, annotation);
        if (shapeIssue) {
          errors.push(shapeIssue);
          continue;
        }

        const annotationId =
          typeof annotation.annotationId === 'string' && annotation.annotationId.length > 0
            ? annotation.annotationId
            : 'unknown';

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

        if (annotation.cardId !== card.cardId) {
          errors.push(
            issue({
              code: 'annotation_ownership_mismatch',
              field: 'cardId',
              reason: `Annotation "${annotationId}" cardId "${String(annotation.cardId)}" does not match containing Card "${card.cardId}".`,
            }),
          );
        }

        errors.push(
          ...frequencyTierIssues(annotation, content.schemaVersion, {
            cardId: card.cardId,
          }),
        );

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

        const occurrenceIndex = (annotation.sourceTarget as { occurrenceIndex?: unknown }).occurrenceIndex;
        if (!isExplicitOccurrenceIndex(occurrenceIndex)) {
          errors.push(occurrenceIndexPackageIssue(card.cardId, annotationId, occurrenceIndex));
          continue;
        }

        const logicalKey = annotationLogicalKey({
          type: annotation.type,
          strategy: annotation.sourceTarget.strategy,
          phrase: annotation.sourceTarget.phrase,
          occurrenceIndex,
        });
        if (seenLogicalAnnotations.has(logicalKey)) {
          errors.push(
            issue({
              code: 'duplicate_annotation',
              field: 'phrase',
              reason: `Card "${card.cardId}" has a duplicate ${annotation.type} annotation for phrase "${annotation.sourceTarget.phrase}" at occurrence ${occurrenceIndex}.`,
            }),
          );
        } else {
          seenLogicalAnnotations.add(logicalKey);
        }

        if (verseTextIssue) {
          continue;
        }
        const resolved = resolveAnnotationTarget({
          verseText: card.verseText,
          sourceTarget: {
            strategy: PHRASE_OCCURRENCE_STRATEGY,
            phrase: annotation.sourceTarget.phrase,
            occurrenceIndex,
          },
        });
        if (resolved.error) {
          errors.push({
            ...resolved.error,
            reason: `Card "${card.cardId}" annotation "${annotationId}": ${resolved.error.reason}`,
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
              reason: `Card "${card.cardId}" annotation "${annotationId}" resolved span does not match the verse text.`,
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

  if (requireAllOfficialDivisions) {
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
  }

  return errors;
}

/**
 * Required Scripture text on every Card, annotated or not.
 * trim() decides whether a string is blank. It is not written back onto the Card.
 * A failure is recorded before annotation spans are resolved.
 */
function cardVerseTextIssue(cardId: string, value: unknown): ValidationIssue | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return undefined;
  }

  const absent = value === undefined || value === null || value === '';
  let detail: string;
  if (value === undefined) {
    detail = 'It is missing.';
  } else if (value === '') {
    detail = 'It is empty.';
  } else {
    detail = `Received ${JSON.stringify(value)}.`;
  }

  return issue({
    code: absent ? 'missing_required_field' : 'invalid_verse_text',
    field: 'verseText',
    reason: `Card "${cardId}" verseText must be a non-empty string. ${detail}`,
  });
}

function isExplicitOccurrenceIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function occurrenceIndexPackageIssue(
  cardId: string,
  annotationId: string,
  value: unknown,
): ValidationIssue {
  const detail = value === undefined ? 'It is missing.' : `Received ${JSON.stringify(value)}.`;
  return issue({
    code: 'invalid_occurrence_index',
    field: 'occurrenceIndex',
    reason: `Card "${cardId}" annotation "${annotationId}" requires an explicit occurrenceIndex that is a whole number of 1 or greater. ${detail}`,
  });
}

/**
 * Required package startDate and endDate. Optional season metadata, including
 * igniteAvailabilityDate, stays out of this check.
 */
function packageSeasonDateIssues(season: object): ValidationIssue[] {
  const record = season as { startDate?: unknown; endDate?: unknown };
  const errors: ValidationIssue[] = [];
  const startDate = readRequiredSeasonDate('startDate', record.startDate, errors);
  const endDate = readRequiredSeasonDate('endDate', record.endDate, errors);
  if (startDate && endDate && startDate > endDate) {
    errors.push(
      issue({
        code: 'invalid_date_range',
        field: 'endDate',
        reason: `Season endDate ${endDate} is before startDate ${startDate}. startDate must be on or before endDate.`,
      }),
    );
  }
  return errors;
}

function readRequiredSeasonDate(
  field: 'startDate' | 'endDate',
  value: unknown,
  errors: ValidationIssue[],
): string | undefined {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim().length === 0)) {
    errors.push(
      issue({
        code: 'missing_required_field',
        field,
        reason: `Season ${field} is required.`,
      }),
    );
    return undefined;
  }
  if (typeof value !== 'string' || !ISO_DATE_SHAPE.test(value)) {
    const shown = typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
    errors.push(
      issue({
        code: 'invalid_date',
        field,
        reason: `Season ${field} ${shown} must be an ISO calendar date (YYYY-MM-DD).`,
      }),
    );
    return undefined;
  }
  if (!isIsoCalendarDate(value)) {
    errors.push(
      issue({
        code: 'invalid_date',
        field,
        reason: `Season ${field} "${value}" is not a real calendar date.`,
      }),
    );
    return undefined;
  }
  return value;
}
