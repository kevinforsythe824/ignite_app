import {
  CONTENT_SCHEMA_VERSION,
  OFFICIAL_DIVISION_ORDER,
  PHRASE_OCCURRENCE_STRATEGY,
  isSyntheticAnnotationType,
} from './constants';
import { deriveAnnotationId, deriveCardId, targetingPayloadForPhraseOccurrence } from './identifiers';
import { resolveAnnotationTarget } from './resolveAnnotationTarget';
import { issue } from './errors';
import type {
  AnnotationRow,
  AuthoringWorkbookData,
  ContentAnnotationRecord,
  ContentCardRecord,
  ContentCrossReference,
  ContentIR,
  ContentMaterialSetRecord,
  ContentPackage,
  ContentQuizMetadata,
  PhraseOccurrenceTarget,
  ValidationIssue,
} from './types';
import {
  sortCurriculumSections,
  type CurriculumSection,
} from '../../src/features/season/domain/curriculumSection';
import { isDivisionId, type DivisionId } from '../../src/features/season/domain/division';
import type { Season, SeasonStatus } from '../../src/features/season/domain/season';

export interface ConversionResult {
  ir?: ContentIR;
  content?: ContentPackage;
  errors: ValidationIssue[];
}

function parseTags(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .sort((left, right) => left.localeCompare(right));
}

function locateCardId(
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

function annotationSourceTarget(row: AnnotationRow): PhraseOccurrenceTarget {
  return {
    strategy: PHRASE_OCCURRENCE_STRATEGY,
    phrase: row.phrase ?? '',
    occurrenceIndex: row.occurrenceIndex ?? Number.NaN,
  };
}

function compareMaterialSets(
  left: ContentMaterialSetRecord,
  right: ContentMaterialSetRecord,
): number {
  const leftOrder = OFFICIAL_DIVISION_ORDER.indexOf(left.divisionId);
  const rightOrder = OFFICIAL_DIVISION_ORDER.indexOf(right.divisionId);
  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }
  return left.materialSetId.localeCompare(right.materialSetId);
}

function compareCards(left: ContentCardRecord, right: ContentCardRecord): number {
  if (left.cardNumber !== right.cardNumber) {
    return left.cardNumber - right.cardNumber;
  }
  return left.cardId.localeCompare(right.cardId);
}

function compareAnnotations(
  left: ContentAnnotationRecord,
  right: ContentAnnotationRecord,
): number {
  return left.annotationId.localeCompare(right.annotationId);
}

function compareCrossReferences(
  left: ContentCrossReference,
  right: ContentCrossReference,
): number {
  const from = left.fromCardId.localeCompare(right.fromCardId);
  if (from !== 0) {
    return from;
  }
  const toCard = (left.toCardId ?? '').localeCompare(right.toCardId ?? '');
  if (toCard !== 0) {
    return toCard;
  }
  return (left.toReference ?? '').localeCompare(right.toReference ?? '');
}

function toSeason(workbook: AuthoringWorkbookData): Season {
  const row = workbook.package;
  const season: Season = {
    seasonId: row.seasonId,
    name: row.name,
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.status as SeasonStatus,
  };
  if (row.sourceMaterialReleaseDate) {
    season.sourceMaterialReleaseDate = row.sourceMaterialReleaseDate;
  }
  if (row.igniteAvailabilityDate) {
    season.igniteAvailabilityDate = row.igniteAvailabilityDate;
  }
  return season;
}

function convertWorkbook(
  workbook: AuthoringWorkbookData,
): { materialSet?: ContentMaterialSetRecord; errors: ValidationIssue[] } {
  const errors: ValidationIssue[] = [];
  if (!isDivisionId(workbook.materialSet.divisionId)) {
    errors.push(
      issue({
        code: 'invalid_division_id',
        workbook: workbook.workbookName,
        sheet: 'MaterialSet',
        row: 2,
        field: 'divisionId',
        reason: `Division ID "${workbook.materialSet.divisionId}" is not an official division.`,
      }),
    );
    return { errors };
  }

  const divisionId: DivisionId = workbook.materialSet.divisionId;
  const cardsByNumber = new Map<number, string>();
  const cardRecords: ContentCardRecord[] = [];

  workbook.cards.forEach((card) => {
    const cardId = deriveCardId(card.cardNumber, card.cardId);
    cardsByNumber.set(card.cardNumber, cardId);
    const record: ContentCardRecord = {
      seasonId: workbook.materialSet.seasonId,
      materialSetId: workbook.materialSet.materialSetId,
      cardId,
      cardNumber: card.cardNumber,
      reference: card.reference,
      verseText: card.verseText,
      sectionId: card.sectionId,
      tags: parseTags(card.tags),
      annotations: [],
      crossReferences: [],
    };
    if (card.indexCode) {
      record.indexCode = card.indexCode;
    }
    cardRecords.push(record);
  });

  const cardsById = new Map(cardRecords.map((card) => [card.cardId, card]));

  workbook.annotations.forEach((annotation, index) => {
    const row = index + 2;
    const cardId = locateCardId(annotation, cardsByNumber);
    const card = cardId ? cardsById.get(cardId) : undefined;
    if (!card || !cardId || !isSyntheticAnnotationType(annotation.type)) {
      return;
    }

    const sourceTarget = annotationSourceTarget(annotation);
    const resolved = resolveAnnotationTarget({
      verseText: card.verseText,
      sourceTarget,
      workbook: workbook.workbookName,
      sheet: 'Annotations',
      row,
    });
    if (resolved.error) {
      errors.push(resolved.error);
      return;
    }
    if (!resolved.resolved) {
      return;
    }

    const record: ContentAnnotationRecord = {
      annotationId: deriveAnnotationId({
        cardId,
        type: annotation.type,
        strategy: sourceTarget.strategy,
        targetingPayload: targetingPayloadForPhraseOccurrence(
          sourceTarget.phrase,
          sourceTarget.occurrenceIndex,
        ),
      }),
      cardId,
      type: annotation.type,
      sourceTarget,
      resolvedTarget: resolved.resolved,
    };
    if (annotation.notes) {
      record.notes = annotation.notes;
    }
    card.annotations.push(record);
  });

  const quizByCard = new Map<string, ContentQuizMetadata>();
  workbook.quizMetadata.forEach((row) => {
    const cardId = locateCardId(row, cardsByNumber);
    if (!cardId) {
      return;
    }
    const metadata: ContentQuizMetadata = { cardId };
    if (row.pointValue !== undefined) {
      metadata.pointValue = row.pointValue;
    }
    if (row.questionHint) {
      metadata.questionHint = row.questionHint;
    }
    quizByCard.set(cardId, metadata);
  });

  workbook.crossReferences.forEach((row) => {
    const fromCardId = locateCardId(
      { cardId: row.fromCardId, cardNumber: row.fromCardNumber },
      cardsByNumber,
    );
    const card = fromCardId ? cardsById.get(fromCardId) : undefined;
    if (!card || !fromCardId) {
      return;
    }
    const xref: ContentCrossReference = { fromCardId };
    if (row.toReference) {
      xref.toReference = row.toReference;
    }
    const toCardId = locateCardId(
      { cardId: row.toCardId, cardNumber: row.toCardNumber },
      cardsByNumber,
    );
    if (toCardId) {
      xref.toCardId = toCardId;
    }
    if (row.notes) {
      xref.notes = row.notes;
    }
    card.crossReferences.push(xref);
  });

  for (const card of cardRecords) {
    card.annotations.sort(compareAnnotations);
    card.crossReferences.sort(compareCrossReferences);
    const quiz = quizByCard.get(card.cardId);
    if (quiz) {
      const { cardId: _cardId, ...rest } = quiz;
      if (rest.pointValue !== undefined || rest.questionHint) {
        card.quizMetadata = rest;
      }
    }
  }

  cardRecords.sort(compareCards);

  const sections: CurriculumSection[] = workbook.sections.map((section) => {
    const cardIds = cardRecords
      .filter((card) => card.sectionId === section.sectionId)
      .sort(compareCards)
      .map((card) => card.cardId);
    const record: CurriculumSection = {
      seasonId: workbook.materialSet.seasonId,
      materialSetId: workbook.materialSet.materialSetId,
      sectionId: section.sectionId,
      title: section.title,
      displayOrder: section.displayOrder,
      cardIds,
    };
    if (section.description) {
      record.description = section.description;
    }
    return record;
  });

  const materialSet: ContentMaterialSetRecord = {
    seasonId: workbook.materialSet.seasonId,
    materialSetId: workbook.materialSet.materialSetId,
    divisionId,
    displayName: workbook.materialSet.displayName,
    sections: sortCurriculumSections(sections),
    cards: cardRecords,
  };

  return { materialSet, errors };
}

export function convertWorkbooksToPackage(
  workbooks: readonly AuthoringWorkbookData[],
): ConversionResult {
  const errors: ValidationIssue[] = [];
  if (workbooks.length === 0) {
    return {
      errors: [issue({ code: 'empty_source', reason: 'No workbooks to convert.' })],
    };
  }

  const first = workbooks[0];
  if (!first) {
    return {
      errors: [issue({ code: 'empty_source', reason: 'No workbooks to convert.' })],
    };
  }

  const materialSets: ContentMaterialSetRecord[] = [];
  for (const workbook of workbooks) {
    const converted = convertWorkbook(workbook);
    errors.push(...converted.errors);
    if (converted.materialSet) {
      materialSets.push(converted.materialSet);
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  materialSets.sort(compareMaterialSets);

  const ir: ContentIR = {
    schemaVersion: CONTENT_SCHEMA_VERSION,
    sourceVersion: first.package.sourceVersion,
    season: toSeason(first),
    materialSets,
    source: {
      workbookNames: workbooks.map((item) => item.workbookName).sort((left, right) =>
        left.localeCompare(right),
      ),
    },
  };

  const content: ContentPackage = {
    schemaVersion: ir.schemaVersion,
    sourceVersion: ir.sourceVersion,
    season: ir.season,
    materialSets: ir.materialSets,
  };

  return { ir, content, errors };
}
