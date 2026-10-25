/**
 * @jest-environment node
 */
import { diffCurriculum } from '../../scripts/content-import/diffPlan';
import { planImportDocuments } from '../../scripts/content-import/planDocuments';
import { serializeCurriculumDocument } from '../../scripts/content-import/serializeCurriculumDocument';
import type { LoadedContentPackage } from '../../scripts/content-import/loadPackage';
import type { ContentPackage } from '../../scripts/content-pipeline/types';

function loadedPackage(): LoadedContentPackage {
  const content: ContentPackage = {
    schemaVersion: '1.1.0',
    sourceVersion: 'official-2027-draft rules 1.0 (2026-07-29)',
    season: {
      seasonId: '2027',
      name: '2027 official draft',
      // Fixture dates only. Not sponsor-confirmed season dates.
      startDate: '2027-09-01',
      endDate: '2028-06-30',
      status: 'draft',
    },
    materialSets: [
      {
        seasonId: '2027',
        materialSetId: 'beginner-2027',
        divisionId: 'beginner',
        displayName: 'Beginner',
        sections: [
          {
            seasonId: '2027',
            materialSetId: 'beginner-2027',
            sectionId: 'shield-of-faith',
            title: 'Shield of Faith',
            displayOrder: 1,
            cardIds: ['c1'],
          },
        ],
        cards: [
          {
            seasonId: '2027',
            materialSetId: 'beginner-2027',
            cardId: 'c1',
            cardNumber: 1,
            reference: 'Sample 1:1',
            verseText: 'Alpha line.',
            sectionId: 'shield-of-faith',
            tags: [],
            studyContext: { battlefield: 4, topic: 'Hope', thematicQuestion: 'What remains?' },
            annotations: [
              {
                annotationId: 'freq',
                cardId: 'c1',
                type: 'frequency',
                frequencyTier: 2,
                sourceTarget: { strategy: 'phraseOccurrence', phrase: 'Alpha', occurrenceIndex: 1 },
                resolvedTarget: { start: 0, end: 5 },
              },
              {
                annotationId: 'begin',
                cardId: 'c1',
                type: 'uniqueBeginning',
                sourceTarget: { strategy: 'phraseOccurrence', phrase: 'Alpha', occurrenceIndex: 1 },
                resolvedTarget: { start: 0, end: 5 },
              },
            ],
            crossReferences: [],
          },
        ],
      },
    ],
  };
  return {
    packageDir: 'fixture',
    content,
    fingerprint: 'fingerprint-1',
    manifest: {
      schemaVersion: content.schemaVersion,
      seasonId: content.season.seasonId,
      sourceVersion: content.sourceVersion,
      converterVersion: '1.0.0',
      materialSets: [],
      cardCounts: { total: 1, byMaterialSet: { 'beginner-2027': 1 } },
      fingerprint: 'fingerprint-1',
      validationStatus: 'passed',
      generatedAt: 'planned-at-import',
    },
  };
}

describe('studyContext and frequencyTier projection', () => {
  it('keeps both fields through serialization and treats a change as an update', () => {
    const plan = planImportDocuments(loadedPackage());
    const card = plan.documents.find((document) => document.kind === 'card');
    if (!card) {
      throw new Error('expected a card document');
    }
    const serialized = serializeCurriculumDocument(card.data);
    expect(serialized.studyContext).toEqual({
      battlefield: 4,
      topic: 'Hope',
      thematicQuestion: 'What remains?',
    });
    expect(typeof (serialized.studyContext as { battlefield: unknown }).battlefield).toBe('number');
    const annotations = serialized.annotations as Array<{ annotationId: string; frequencyTier?: number }>;
    expect(annotations.find((item) => item.annotationId === 'freq')?.frequencyTier).toBe(2);
    expect(annotations.find((item) => item.annotationId === 'begin')).not.toHaveProperty('frequencyTier');

    const documents = plan.documents.map((document) => ({
      path: document.path,
      data: serializeCurriculumDocument(document.data),
    }));
    expect(diffCurriculum(plan, { seasonId: plan.seasonId, documents }).counts.UNCHANGED).toBe(
      plan.documents.length,
    );

    const topicChanged = documents.map((document) => {
      if (!document.path.endsWith('/cards/c1')) {
        return document;
      }
      const studyContext = {
        ...(document.data.studyContext as { battlefield: number; topic: string; thematicQuestion: string }),
        topic: 'Changed',
      };
      return { ...document, data: { ...document.data, studyContext } };
    });
    expect(
      diffCurriculum(plan, { seasonId: plan.seasonId, documents: topicChanged }).counts.UPDATE,
    ).toBe(1);

    const tierChanged = documents.map((document) => {
      if (!document.path.endsWith('/cards/c1')) {
        return document;
      }
      const annotationsCopy = (document.data.annotations as Array<Record<string, unknown>>).map((item) =>
        item.annotationId === 'freq' ? { ...item, frequencyTier: 5 } : item,
      );
      return { ...document, data: { ...document.data, annotations: annotationsCopy } };
    });
    expect(
      diffCurriculum(plan, { seasonId: plan.seasonId, documents: tierChanged }).counts.UPDATE,
    ).toBe(1);
  });
});
