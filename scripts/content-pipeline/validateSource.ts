import {
  PHRASE_OCCURRENCE_STRATEGY,
  isSupportedAnnotationStrategy,
  isSupportedContentSchemaVersion,
  isSyntheticAnnotationType,
} from './constants';
import { issue } from './errors';
import { deriveCardId } from './identifiers';
import type { AuthoringWorkbookData, ValidationIssue } from './types';
import { isDivisionId } from '../../src/features/season/domain/division';
import { SEASON_STATUSES } from '../../src/features/season/domain/season';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function requireText(
  value: string | undefined,
  field: string,
  location: { workbook: string; sheet: string; row: number },
  reason: string,
): ValidationIssue | undefined {
  if (value && value.trim().length > 0) {
    return undefined;
  }
  return issue({
    code: 'missing_required_field',
    workbook: location.workbook,
    sheet: location.sheet,
    row: location.row,
    field,
    reason,
  });
}

export function validateSourceWorkbook(data: AuthoringWorkbookData): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  const workbook = data.workbookName;

  const pkg = data.package;
  const packageFields: Array<[keyof typeof pkg, string]> = [
    ['seasonId', 'Season ID is required.'],
    ['name', 'Season name is required.'],
    ['startDate', 'Season startDate is required.'],
    ['endDate', 'Season endDate is required.'],
    ['status', 'Season status is required.'],
    ['sourceVersion', 'sourceVersion is required.'],
    ['schemaVersion', 'schemaVersion is required.'],
  ];
  for (const [field, reason] of packageFields) {
    const missing = requireText(pkg[field], field, { workbook, sheet: 'Package', row: 2 }, reason);
    if (missing) {
      errors.push(missing);
    }
  }

  if (pkg.schemaVersion && !isSupportedContentSchemaVersion(pkg.schemaVersion)) {
    errors.push(
      issue({
        code: 'unsupported_schema_version',
        workbook,
        sheet: 'Package',
        row: 2,
        field: 'schemaVersion',
        reason: `Unsupported schemaVersion "${pkg.schemaVersion}".`,
      }),
    );
  }

  if (pkg.status && !(SEASON_STATUSES as readonly string[]).includes(pkg.status)) {
    errors.push(
      issue({
        code: 'invalid_season_status',
        workbook,
        sheet: 'Package',
        row: 2,
        field: 'status',
        reason: `Unknown season status "${pkg.status}".`,
      }),
    );
  }

  for (const field of ['startDate', 'endDate', 'sourceMaterialReleaseDate', 'igniteAvailabilityDate'] as const) {
    const value = pkg[field];
    if (value && !ISO_DATE.test(value)) {
      errors.push(
        issue({
          code: 'invalid_date',
          workbook,
          sheet: 'Package',
          row: 2,
          field,
          reason: `${field} must be an ISO date (YYYY-MM-DD) when provided.`,
        }),
      );
    }
  }

  const ms = data.materialSet;
  const msFields: Array<[keyof typeof ms, string]> = [
    ['seasonId', 'Season ID is required.'],
    ['materialSetId', 'MaterialSet ID is required.'],
    ['divisionId', 'Division ID is required.'],
    ['displayName', 'MaterialSet displayName is required.'],
  ];
  for (const [field, reason] of msFields) {
    const missing = requireText(ms[field], field, { workbook, sheet: 'MaterialSet', row: 2 }, reason);
    if (missing) {
      errors.push(missing);
    }
  }

  if (ms.divisionId && !isDivisionId(ms.divisionId)) {
    errors.push(
      issue({
        code: 'invalid_division_id',
        workbook,
        sheet: 'MaterialSet',
        row: 2,
        field: 'divisionId',
        reason: `Division ID "${ms.divisionId}" is not an official division.`,
      }),
    );
  }

  if (pkg.seasonId && ms.seasonId && pkg.seasonId !== ms.seasonId) {
    errors.push(
      issue({
        code: 'season_id_mismatch',
        workbook,
        sheet: 'MaterialSet',
        row: 2,
        field: 'seasonId',
        reason: `MaterialSet seasonId "${ms.seasonId}" does not match Package seasonId "${pkg.seasonId}".`,
      }),
    );
  }

  const sectionIds = new Set<string>();
  data.sections.forEach((section, index) => {
    const row = index + 2;
    if (!section.sectionId) {
      errors.push(
        issue({
          code: 'missing_required_field',
          workbook,
          sheet: 'Sections',
          row,
          field: 'sectionId',
          reason: 'sectionId is required.',
        }),
      );
    } else if (sectionIds.has(section.sectionId)) {
      errors.push(
        issue({
          code: 'duplicate_section_id',
          workbook,
          sheet: 'Sections',
          row,
          field: 'sectionId',
          reason: `Duplicate sectionId "${section.sectionId}".`,
        }),
      );
    } else {
      sectionIds.add(section.sectionId);
    }

    if (!section.title) {
      errors.push(
        issue({
          code: 'missing_required_field',
          workbook,
          sheet: 'Sections',
          row,
          field: 'title',
          reason: 'Section title is required.',
        }),
      );
    }

    if (!Number.isInteger(section.displayOrder)) {
      errors.push(
        issue({
          code: 'invalid_display_order',
          workbook,
          sheet: 'Sections',
          row,
          field: 'displayOrder',
          reason: 'Section displayOrder must be an integer.',
        }),
      );
    }
  });

  const cardNumbers = new Set<number>();
  const cardIds = new Set<string>();
  const cardsByNumber = new Map<number, string>();
  const cardsById = new Map<string, number>();

  data.cards.forEach((card, index) => {
    const row = index + 2;
    if (!Number.isInteger(card.cardNumber)) {
      errors.push(
        issue({
          code: 'invalid_card_number',
          workbook,
          sheet: 'Cards',
          row,
          field: 'cardNumber',
          reason: 'Card number is required and must be an integer.',
        }),
      );
    } else if (cardNumbers.has(card.cardNumber)) {
      errors.push(
        issue({
          code: 'duplicate_card_number',
          workbook,
          sheet: 'Cards',
          row,
          field: 'cardNumber',
          reason: `Duplicate card number ${card.cardNumber} within this MaterialSet.`,
        }),
      );
    } else {
      cardNumbers.add(card.cardNumber);
    }

    if (!card.reference) {
      errors.push(
        issue({
          code: 'missing_required_field',
          workbook,
          sheet: 'Cards',
          row,
          field: 'reference',
          reason: 'Scripture reference is required.',
        }),
      );
    }

    if (!card.verseText) {
      errors.push(
        issue({
          code: 'missing_required_field',
          workbook,
          sheet: 'Cards',
          row,
          field: 'verseText',
          reason: 'Scripture text is required.',
        }),
      );
    }

    if (!card.sectionId) {
      errors.push(
        issue({
          code: 'missing_required_field',
          workbook,
          sheet: 'Cards',
          row,
          field: 'sectionId',
          reason: 'sectionId is required.',
        }),
      );
    } else if (!sectionIds.has(card.sectionId)) {
      errors.push(
        issue({
          code: 'invalid_section',
          workbook,
          sheet: 'Cards',
          row,
          field: 'sectionId',
          reason: `Card sectionId "${card.sectionId}" is not a defined Section.`,
        }),
      );
    }

    if (Number.isInteger(card.cardNumber)) {
      const resolvedId = deriveCardId(card.cardNumber, card.cardId);
      if (cardIds.has(resolvedId)) {
        errors.push(
          issue({
            code: 'duplicate_card_id',
            workbook,
            sheet: 'Cards',
            row,
            field: 'cardId',
            reason: `Duplicate cardId "${resolvedId}" within this MaterialSet.`,
          }),
        );
      } else {
        cardIds.add(resolvedId);
        cardsByNumber.set(card.cardNumber, resolvedId);
        cardsById.set(resolvedId, card.cardNumber);
      }
    }
  });

  data.annotations.forEach((annotation, index) => {
    const row = index + 2;
    resolveLocator({
      cardId: annotation.cardId,
      cardNumber: annotation.cardNumber,
      cardsById,
      cardsByNumber,
      errors,
      workbook,
      sheet: 'Annotations',
      row,
    });

    if (!annotation.type) {
      errors.push(
        issue({
          code: 'missing_required_field',
          workbook,
          sheet: 'Annotations',
          row,
          field: 'type',
          reason: 'Annotation type is required.',
        }),
      );
    } else if (!isSyntheticAnnotationType(annotation.type)) {
      errors.push(
        issue({
          code: 'unsupported_annotation_type',
          workbook,
          sheet: 'Annotations',
          row,
          field: 'type',
          reason: `Unsupported annotation type "${annotation.type}". Phase 2A.1 synthetic types only; official mapping is Phase 2B.`,
        }),
      );
    }

    if (!annotation.strategy) {
      errors.push(
        issue({
          code: 'missing_required_field',
          workbook,
          sheet: 'Annotations',
          row,
          field: 'strategy',
          reason: 'Annotation target strategy is required.',
        }),
      );
    } else if (!isSupportedAnnotationStrategy(annotation.strategy)) {
      errors.push(
        issue({
          code: 'unsupported_annotation_strategy',
          workbook,
          sheet: 'Annotations',
          row,
          field: 'strategy',
          reason: `Unsupported annotation target strategy "${annotation.strategy}". Phase 2A.1 supports only "${PHRASE_OCCURRENCE_STRATEGY}".`,
        }),
      );
    }

    if (annotation.strategy === PHRASE_OCCURRENCE_STRATEGY) {
      if (!annotation.phrase) {
        errors.push(
          issue({
            code: 'missing_required_field',
            workbook,
            sheet: 'Annotations',
            row,
            field: 'phrase',
            reason: 'phrase is required for phraseOccurrence targeting.',
          }),
        );
      }
      if (annotation.occurrenceIndex === undefined) {
        errors.push(
          issue({
            code: 'ambiguous_phrase_target',
            workbook,
            sheet: 'Annotations',
            row,
            field: 'occurrenceIndex',
            reason:
              'occurrenceIndex is required for phraseOccurrence targeting. The pipeline will not silently select the first match.',
          }),
        );
      }
    }
  });

  data.quizMetadata.forEach((rowData, index) => {
    const row = index + 2;
    resolveLocator({
      cardId: rowData.cardId,
      cardNumber: rowData.cardNumber,
      cardsById,
      cardsByNumber,
      errors,
      workbook,
      sheet: 'QuizMetadata',
      row,
    });
    if (
      rowData.pointValue === undefined &&
      !rowData.questionHint &&
      !rowData.cardId &&
      rowData.cardNumber === undefined
    ) {
      errors.push(
        issue({
          code: 'invalid_quiz_metadata',
          workbook,
          sheet: 'QuizMetadata',
          row,
          reason: 'QuizMetadata row is present but contains no usable fields.',
        }),
      );
    }
  });

  data.crossReferences.forEach((rowData, index) => {
    const row = index + 2;
    resolveLocator({
      cardId: rowData.fromCardId,
      cardNumber: rowData.fromCardNumber,
      cardsById,
      cardsByNumber,
      errors,
      workbook,
      sheet: 'CrossReferences',
      row,
      fieldPrefix: 'from',
    });
    if (rowData.toCardId || rowData.toCardNumber !== undefined) {
      resolveLocator({
        cardId: rowData.toCardId,
        cardNumber: rowData.toCardNumber,
        cardsById,
        cardsByNumber,
        errors,
        workbook,
        sheet: 'CrossReferences',
        row,
        fieldPrefix: 'to',
      });
    }
    if (!rowData.toReference && !rowData.toCardId && rowData.toCardNumber === undefined) {
      errors.push(
        issue({
          code: 'invalid_cross_reference',
          workbook,
          sheet: 'CrossReferences',
          row,
          reason: 'Cross reference must include toReference or a target card locator.',
        }),
      );
    }
  });

  for (const section of data.sections) {
    const hasMember = data.cards.some((card) => card.sectionId === section.sectionId);
    if (!hasMember && section.sectionId) {
      errors.push(
        issue({
          code: 'orphan_section',
          workbook,
          sheet: 'Sections',
          field: 'sectionId',
          reason: `Section "${section.sectionId}" has no member Cards.`,
        }),
      );
    }
  }

  return errors;
}

function resolveLocator(input: {
  cardId?: string;
  cardNumber?: number;
  cardsById: Map<string, number>;
  cardsByNumber: Map<number, string>;
  errors: ValidationIssue[];
  workbook: string;
  sheet: string;
  row: number;
  fieldPrefix?: string;
}): string | undefined {
  const idField = input.fieldPrefix ? `${input.fieldPrefix}CardId` : 'cardId';
  const numberField = input.fieldPrefix ? `${input.fieldPrefix}CardNumber` : 'cardNumber';

  if (!input.cardId && input.cardNumber === undefined) {
    input.errors.push(
      issue({
        code: 'missing_required_field',
        workbook: input.workbook,
        sheet: input.sheet,
        row: input.row,
        field: `${idField}|${numberField}`,
        reason: 'A card locator (cardId or cardNumber) is required.',
      }),
    );
    return undefined;
  }

  if (input.cardId && !input.cardsById.has(input.cardId)) {
    input.errors.push(
      issue({
        code: 'unknown_card_locator',
        workbook: input.workbook,
        sheet: input.sheet,
        row: input.row,
        field: idField,
        reason: `cardId "${input.cardId}" does not match a Card in this MaterialSet.`,
      }),
    );
    return undefined;
  }

  if (input.cardNumber !== undefined && !input.cardsByNumber.has(input.cardNumber)) {
    input.errors.push(
      issue({
        code: 'unknown_card_locator',
        workbook: input.workbook,
        sheet: input.sheet,
        row: input.row,
        field: numberField,
        reason: `cardNumber ${input.cardNumber} does not match a Card in this MaterialSet.`,
      }),
    );
    return undefined;
  }

  if (input.cardId && input.cardNumber !== undefined) {
    const fromNumber = input.cardsByNumber.get(input.cardNumber);
    if (fromNumber !== input.cardId) {
      input.errors.push(
        issue({
          code: 'card_locator_mismatch',
          workbook: input.workbook,
          sheet: input.sheet,
          row: input.row,
          field: `${idField}|${numberField}`,
          reason: `cardId "${input.cardId}" does not belong to cardNumber ${input.cardNumber}.`,
        }),
      );
      return undefined;
    }
  }

  return input.cardId ?? input.cardsByNumber.get(input.cardNumber as number);
}

export function validateSourceCollection(
  workbooks: readonly AuthoringWorkbookData[],
): ValidationIssue[] {
  const errors: ValidationIssue[] = [];
  if (workbooks.length === 0) {
    errors.push(
      issue({
        code: 'empty_source',
        reason: 'No MaterialSet workbooks were found to validate.',
      }),
    );
    return errors;
  }

  const seasonIds = new Set(workbooks.map((item) => item.package.seasonId));
  if (seasonIds.size > 1) {
    errors.push(
      issue({
        code: 'season_id_mismatch',
        reason: `Workbooks disagree on seasonId: ${[...seasonIds].sort().join(', ')}.`,
      }),
    );
  }

  const materialSetIds = new Map<string, string>();
  const divisionIds = new Map<string, string>();
  for (const workbook of workbooks) {
    const { materialSetId, divisionId } = workbook.materialSet;
    if (materialSetId && materialSetIds.has(materialSetId)) {
      errors.push(
        issue({
          code: 'duplicate_material_set_id',
          workbook: workbook.workbookName,
          sheet: 'MaterialSet',
          field: 'materialSetId',
          reason: `Duplicate materialSetId "${materialSetId}" (also in ${materialSetIds.get(materialSetId)}).`,
        }),
      );
    } else if (materialSetId) {
      materialSetIds.set(materialSetId, workbook.workbookName);
    }

    if (divisionId && divisionIds.has(divisionId)) {
      errors.push(
        issue({
          code: 'material_set_division_mismatch',
          workbook: workbook.workbookName,
          sheet: 'MaterialSet',
          field: 'divisionId',
          reason: `Division "${divisionId}" is already claimed by ${divisionIds.get(divisionId)}. MaterialSets are 1:1 with divisions.`,
        }),
      );
    } else if (divisionId) {
      divisionIds.set(divisionId, workbook.workbookName);
    }
  }

  return errors;
}
