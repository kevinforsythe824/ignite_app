import { deriveCardId } from './identifiers';
import { isRejectedOccurrenceIndex } from './occurrenceIndex';
import { issue } from './errors';
import type {
  AuthoringWorkbookData,
  ContentPackage,
  ReconciliationReport,
  ValidationIssue,
} from './types';

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
