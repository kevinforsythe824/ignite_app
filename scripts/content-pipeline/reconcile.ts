import { deriveCardId } from './identifiers';
import { isRejectedOccurrenceIndex } from './occurrenceIndex';
import { issue } from './errors';
import type {
  AnnotationRow,
  AuthoringWorkbookData,
  ContentAnnotationRecord,
  ContentCardRecord,
  ContentPackage,
  ReconciliationReport,
  ValidationIssue,
} from './types';

/**
 * Logical annotation identity. Notes and frequency tier are included so a
 * same-count substitution cannot pass as the source annotation.
 * A blank occurrence index is stored as 1 after a successful conversion.
 */
function annotationIdentityKey(input: {
  type: string;
  phrase: string;
  occurrenceIndex: number;
  frequencyTier?: number;
  notes?: string;
}): string {
  return [
    input.type,
    input.phrase,
    String(input.occurrenceIndex),
    input.frequencyTier === undefined ? '' : String(input.frequencyTier),
    input.notes ?? '',
  ].join('\u001f');
}

function locateSourceCardId(
  row: { cardId?: string; cardNumber?: number },
  cardsByNumber: Map<number, string>,
): string | undefined {
  if (row.cardId) {
    return row.cardId;
  }
  if (row.cardNumber !== undefined) {
    return cardsByNumber.get(row.cardNumber);
  }
  return undefined;
}

function sourceAnnotationKey(annotation: AnnotationRow): string {
  return annotationIdentityKey({
    type: annotation.type,
    phrase: annotation.phrase ?? '',
    occurrenceIndex: annotation.occurrenceIndex ?? 1,
    frequencyTier: annotation.frequencyTier,
    notes: annotation.notes,
  });
}

function generatedAnnotationKey(annotation: ContentAnnotationRecord): string {
  return annotationIdentityKey({
    type: annotation.type,
    phrase: annotation.sourceTarget.phrase,
    occurrenceIndex: annotation.sourceTarget.occurrenceIndex,
    frequencyTier: annotation.frequencyTier,
    notes: annotation.notes,
  });
}

function annotationIdentityMismatches(
  workbook: AuthoringWorkbookData,
  generatedCards: readonly ContentCardRecord[],
): ValidationIssue[] {
  const cardsByNumber = new Map<number, string>();
  for (const card of workbook.cards) {
    cardsByNumber.set(card.cardNumber, deriveCardId(card.cardNumber, card.cardId));
  }
  const generatedById = new Map(generatedCards.map((card) => [card.cardId, card]));
  const expectedByCard = new Map<string, Map<string, number>>();
  const errors: ValidationIssue[] = [];

  for (const annotation of workbook.annotations) {
    if (isRejectedOccurrenceIndex(annotation)) {
      continue;
    }
    const cardId = locateSourceCardId(annotation, cardsByNumber);
    if (!cardId) {
      errors.push(
        issue({
          code: 'reconciliation_annotation_mismatch',
          workbook: workbook.workbookName,
          sheet: 'Annotations',
          row: annotation.sourceRow,
          field: 'cardNumber',
          reason: `Annotation on ${workbook.materialSet.materialSetId} has no Card.`,
        }),
      );
      continue;
    }
    const counts = expectedByCard.get(cardId) ?? new Map<string, number>();
    const key = sourceAnnotationKey(annotation);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    expectedByCard.set(cardId, counts);
  }

  const seenCards = new Set<string>();
  for (const [cardId, expected] of expectedByCard) {
    seenCards.add(cardId);
    const card = generatedById.get(cardId);
    if (!card) {
      errors.push(
        issue({
          code: 'reconciliation_annotation_mismatch',
          workbook: workbook.workbookName,
          sheet: 'Annotations',
          field: 'cardId',
          reason: `Card "${cardId}" annotations were not found on MaterialSet "${workbook.materialSet.materialSetId}".`,
        }),
      );
      continue;
    }
    const actual = new Map<string, number>();
    for (const annotation of card.annotations) {
      const slice = card.verseText.slice(annotation.resolvedTarget.start, annotation.resolvedTarget.end);
      if (slice !== annotation.sourceTarget.phrase) {
        errors.push(
          issue({
            code: 'reconciliation_annotation_mismatch',
            workbook: workbook.workbookName,
            sheet: 'Annotations',
            field: 'phrase',
            reason: `Card "${cardId}" annotation "${annotation.annotationId}" is not an exact verse slice.`,
          }),
        );
      }
      const key = generatedAnnotationKey(annotation);
      actual.set(key, (actual.get(key) ?? 0) + 1);
    }
    for (const [key, count] of expected) {
      const found = actual.get(key) ?? 0;
      if (found !== count) {
        const phrase = key.split('\u001f')[1] ?? '';
        errors.push(
          issue({
            code: 'reconciliation_annotation_mismatch',
            workbook: workbook.workbookName,
            sheet: 'Annotations',
            field: 'phrase',
            reason: `Card "${cardId}" expected ${count} annotation(s) for "${phrase}" and found ${found}.`,
          }),
        );
      }
    }
    for (const [key, count] of actual) {
      if (!expected.has(key)) {
        const phrase = key.split('\u001f')[1] ?? '';
        errors.push(
          issue({
            code: 'reconciliation_annotation_mismatch',
            workbook: workbook.workbookName,
            sheet: 'Annotations',
            field: 'phrase',
            reason: `Card "${cardId}" has ${count} generated annotation(s) for "${phrase}" with no source row.`,
          }),
        );
      }
    }
  }

  for (const card of generatedCards) {
    if (seenCards.has(card.cardId) || card.annotations.length === 0) {
      continue;
    }
    errors.push(
      issue({
        code: 'reconciliation_annotation_mismatch',
        workbook: workbook.workbookName,
        sheet: 'Annotations',
        field: 'cardId',
        reason: `Card "${card.cardId}" has ${card.annotations.length} generated annotation(s) with no source rows.`,
      }),
    );
  }

  return errors;
}

export function reconcileSourceToPackage(
  workbooks: readonly AuthoringWorkbookData[],
  content: ContentPackage,
): { report: ReconciliationReport; errors: ValidationIssue[] } {
  const errors: ValidationIssue[] = [];
  const unmappedSourceValues: string[] = [];
  const mismatches: string[] = [];

  const sourceCardCount = workbooks.reduce((sum, workbook) => sum + workbook.cards.length, 0);
  const generatedCardCount = content.materialSets.reduce(
    (sum, materialSet) => sum + materialSet.cards.length,
    0,
  );

  const cardsPerMaterialSet: Record<string, number> = {};
  const cardsPerSection: Record<string, number> = {};
  const annotationsPerMaterialSet: Record<string, number> = {};
  const annotationsPerType: Record<string, number> = {};

  for (const materialSet of content.materialSets) {
    cardsPerMaterialSet[materialSet.materialSetId] = materialSet.cards.length;
    let annotationCount = 0;
    for (const card of materialSet.cards) {
      annotationCount += card.annotations.length;
      const sectionKey = `${materialSet.materialSetId}:${card.sectionId}`;
      cardsPerSection[sectionKey] = (cardsPerSection[sectionKey] ?? 0) + 1;
      for (const annotation of card.annotations) {
        annotationsPerType[annotation.type] = (annotationsPerType[annotation.type] ?? 0) + 1;
      }
    }
    annotationsPerMaterialSet[materialSet.materialSetId] = annotationCount;
  }

  if (sourceCardCount !== generatedCardCount) {
    const message = `Source card count ${sourceCardCount} does not match generated card count ${generatedCardCount}.`;
    mismatches.push(message);
    errors.push(issue({ code: 'reconciliation_card_count', reason: message }));
  }

  const generatedBySet = new Map(
    content.materialSets.map((materialSet) => [materialSet.materialSetId, materialSet]),
  );

  for (const workbook of workbooks) {
    const generated = generatedBySet.get(workbook.materialSet.materialSetId);
    if (!generated) {
      const message = `Source MaterialSet "${workbook.materialSet.materialSetId}" is missing from the generated package.`;
      mismatches.push(message);
      errors.push(
        issue({
          code: 'reconciliation_missing_material_set',
          workbook: workbook.workbookName,
          reason: message,
        }),
      );
      continue;
    }

    if (generated.cards.length !== workbook.cards.length) {
      const message = `MaterialSet "${workbook.materialSet.materialSetId}" source cards ${workbook.cards.length} vs generated ${generated.cards.length}.`;
      mismatches.push(message);
      errors.push(issue({ code: 'reconciliation_card_count', reason: message }));
    }

    const generatedIds = new Set(generated.cards.map((card) => card.cardId));
    for (const card of workbook.cards) {
      const expectedId = deriveCardId(card.cardNumber, card.cardId);
      if (!generatedIds.has(expectedId)) {
        const message = `Source card ${expectedId} from ${workbook.workbookName} is missing in the generated package.`;
        mismatches.push(message);
        errors.push(
          issue({
            code: 'reconciliation_missing_card',
            workbook: workbook.workbookName,
            sheet: 'Cards',
            field: 'cardId',
            reason: message,
          }),
        );
      }
    }

    const generatedSectionIds = new Set(generated.sections.map((section) => section.sectionId));
    for (const section of workbook.sections) {
      if (!generatedSectionIds.has(section.sectionId)) {
        const message = `Source section "${section.sectionId}" from ${workbook.workbookName} is missing in the generated package.`;
        mismatches.push(message);
        errors.push(
          issue({
            code: 'reconciliation_missing_section',
            workbook: workbook.workbookName,
            sheet: 'Sections',
            field: 'sectionId',
            reason: message,
          }),
        );
      }
    }

    const sourceAnnotationCount = workbook.annotations.filter(
      (annotation) => !isRejectedOccurrenceIndex(annotation),
    ).length;
    const generatedAnnotationCount = generated.cards.reduce(
      (sum, card) => sum + card.annotations.length,
      0,
    );
    if (sourceAnnotationCount !== generatedAnnotationCount) {
      const message = `MaterialSet "${workbook.materialSet.materialSetId}" source annotations ${sourceAnnotationCount} vs generated ${generatedAnnotationCount}.`;
      mismatches.push(message);
      errors.push(issue({ code: 'reconciliation_annotation_count', reason: message }));
    }

    const identityErrors = annotationIdentityMismatches(workbook, generated.cards);
    for (const message of identityErrors) {
      mismatches.push(message.reason);
      errors.push(message);
    }
  }

  for (const materialSet of content.materialSets) {
    const source = workbooks.find(
      (workbook) => workbook.materialSet.materialSetId === materialSet.materialSetId,
    );
    if (!source) {
      unmappedSourceValues.push(
        `generated materialSetId "${materialSet.materialSetId}" has no matching source workbook`,
      );
    }
  }

  return {
    report: {
      counts: {
        sourceCardCount,
        generatedCardCount,
        cardsPerMaterialSet,
        cardsPerSection,
        annotationsPerMaterialSet,
        annotationsPerType,
      },
      unmappedSourceValues,
      mismatches,
    },
    errors,
  };
}
