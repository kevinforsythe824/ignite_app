import { sortCurriculumSections } from '../../src/features/season/domain/curriculumSection';
import type { ContentCardRecord, ContentMaterialSetRecord } from '../content-pipeline/types';
import { CONTENT_IMPORTER_VERSION, IMPORT_PLAN_RUNTIME_PLACEHOLDER } from './constants';
import type { LoadedContentPackage } from './loadPackage';
import {
  cardDocumentPath,
  materialSetDocumentPath,
  seasonDocumentPath,
  sectionDocumentPath,
} from './paths';
import type { ImportPlan, PlannedDocument } from './types';

function definedFields(fields: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

function cardDocumentData(card: ContentCardRecord): Record<string, unknown> {
  return definedFields({
    seasonId: card.seasonId,
    materialSetId: card.materialSetId,
    cardId: card.cardId,
    cardNumber: card.cardNumber,
    reference: card.reference,
    verseText: card.verseText,
    sectionId: card.sectionId,
    indexCode: card.indexCode,
    tags: [...card.tags],
    quizMetadata: card.quizMetadata,
    crossReferences: card.crossReferences.map((item) => ({ ...item })),
    annotations: card.annotations.map((annotation) => ({
      ...annotation,
      sourceTarget: { ...annotation.sourceTarget },
      resolvedTarget: { ...annotation.resolvedTarget },
    })),
  });
}

function planMaterialSet(
  seasonId: string,
  materialSet: ContentMaterialSetRecord,
): PlannedDocument[] {
  const documents: PlannedDocument[] = [
    {
      path: materialSetDocumentPath(seasonId, materialSet.materialSetId),
      kind: 'materialSet',
      data: {
        seasonId: materialSet.seasonId,
        materialSetId: materialSet.materialSetId,
        divisionId: materialSet.divisionId,
        displayName: materialSet.displayName,
      },
    },
  ];

  const sections = sortCurriculumSections(materialSet.sections);
  for (const section of sections) {
    documents.push({
      path: sectionDocumentPath(seasonId, materialSet.materialSetId, section.sectionId),
      kind: 'section',
      data: definedFields({
        seasonId: section.seasonId,
        materialSetId: section.materialSetId,
        sectionId: section.sectionId,
        title: section.title,
        description: section.description,
        displayOrder: section.displayOrder,
        cardIds: [...section.cardIds],
      }),
    });
  }

  const cards = [...materialSet.cards].sort((left, right) => {
    if (left.cardNumber !== right.cardNumber) {
      return left.cardNumber - right.cardNumber;
    }
    return left.cardId.localeCompare(right.cardId);
  });
  for (const card of cards) {
    documents.push({
      path: cardDocumentPath(seasonId, materialSet.materialSetId, card.cardId),
      kind: 'card',
      data: cardDocumentData(card),
    });
  }

  return documents;
}

/** Pure expected Firestore tree. No Firebase and no clock. */
export function planImportDocuments(loaded: LoadedContentPackage): ImportPlan {
  const { content, manifest } = loaded;
  const seasonId = content.season.seasonId;
  const materialSets = [...content.materialSets].sort((left, right) =>
    left.materialSetId.localeCompare(right.materialSetId),
  );

  const documents: PlannedDocument[] = [
    {
      path: seasonDocumentPath(seasonId),
      kind: 'season',
      data: definedFields({
        seasonId: content.season.seasonId,
        name: content.season.name,
        startDate: content.season.startDate,
        endDate: content.season.endDate,
        status: content.season.status,
        sourceMaterialReleaseDate: content.season.sourceMaterialReleaseDate,
        igniteAvailabilityDate: content.season.igniteAvailabilityDate,
        provenance: {
          schemaVersion: content.schemaVersion,
          sourceVersion: content.sourceVersion,
          fingerprint: manifest.fingerprint,
          converterVersion: manifest.converterVersion,
          importerVersion: CONTENT_IMPORTER_VERSION,
          environment: IMPORT_PLAN_RUNTIME_PLACEHOLDER,
          importedAt: IMPORT_PLAN_RUNTIME_PLACEHOLDER,
          importStatus: IMPORT_PLAN_RUNTIME_PLACEHOLDER,
        },
      }),
    },
  ];

  for (const materialSet of materialSets) {
    documents.push(...planMaterialSet(seasonId, materialSet));
  }

  const cards = documents.filter((document) => document.kind === 'card');
  const annotations = cards.reduce((sum, document) => {
    const embedded = document.data.annotations;
    return sum + (Array.isArray(embedded) ? embedded.length : 0);
  }, 0);

  return {
    seasonId,
    fingerprint: manifest.fingerprint,
    counts: {
      seasons: 1,
      materialSets: documents.filter((document) => document.kind === 'materialSet').length,
      sections: documents.filter((document) => document.kind === 'section').length,
      cards: cards.length,
      annotations,
    },
    documents,
  };
}
