/**
 * @jest-environment node
 */
import { diffCurriculum } from '../../scripts/content-import/diffPlan';
import { planImportDocuments } from '../../scripts/content-import/planDocuments';
import {
  CurriculumSerializationError,
  serializeCurriculumDocument,
} from '../../scripts/content-import/serializeCurriculumDocument';
import type { ImportPlan } from '../../scripts/content-import/types';
import { CONVERTER_VERSION } from '../../scripts/content-pipeline/constants';
import type { ContentPackage } from '../../scripts/content-pipeline/types';
import type { LoadedContentPackage } from '../../scripts/content-import/loadPackage';

function samplePlan(): ImportPlan {
  const content: ContentPackage = {
    schemaVersion: '1.0.0',
    sourceVersion: 'fixture',
    season: {
      seasonId: 'fixture-season',
      name: 'Fixture',
      startDate: '2099-01-01',
      endDate: '2099-12-31',
      status: 'draft',
    },
    materialSets: [
      {
        seasonId: 'fixture-season',
        materialSetId: 'cadet',
        divisionId: 'cadet',
        displayName: 'Cadet',
        sections: [
          {
            seasonId: 'fixture-season',
            materialSetId: 'cadet',
            sectionId: 'section-1',
            title: 'Section',
            displayOrder: 1,
            cardIds: ['c2', 'c1'],
          },
        ],
        cards: [
          {
            seasonId: 'fixture-season',
            materialSetId: 'cadet',
            cardId: 'c1',
            cardNumber: 1,
            reference: 'Cadet 1',
            verseText: 'Alpha beta alpha',
            sectionId: 'section-1',
            tags: ['b', 'a'],
            annotations: [
              {
                annotationId: 'a2',
                cardId: 'c1',
                type: 'keyword',
                sourceTarget: { strategy: 'phraseOccurrence', phrase: 'beta', occurrenceIndex: 1 },
                resolvedTarget: { start: 6, end: 10 },
              },
              {
                annotationId: 'a1',
                cardId: 'c1',
                type: 'keyword',
                sourceTarget: { strategy: 'phraseOccurrence', phrase: 'alpha', occurrenceIndex: 1 },
                resolvedTarget: { start: 0, end: 5 },
                notes: 'keep',
              },
            ],
            crossReferences: [
              { fromCardId: 'c1', toReference: 'Other 1' },
              { fromCardId: 'c1', toCardId: 'c2', notes: 'see' },
            ],
          },
        ],
      },
    ],
  };
  const loaded: LoadedContentPackage = {
    packageDir: 'fixture',
    content,
    fingerprint: 'fingerprint-1',
    manifest: {
      schemaVersion: content.schemaVersion,
      seasonId: content.season.seasonId,
      sourceVersion: content.sourceVersion,
      converterVersion: CONVERTER_VERSION,
      materialSets: [],
      cardCounts: { total: 1, byMaterialSet: {} },
      fingerprint: 'fingerprint-1',
      validationStatus: 'passed',
      generatedAt: 'planned-at-import',
    },
  };
  return planImportDocuments(loaded);
}

describe('serializeCurriculumDocument', () => {
  it('omits undefined, preserves order and date strings, and round-trips authoritative fields', () => {
    const plan = samplePlan();
    const documents = plan.documents.map((document) => ({
      path: document.path,
      data: serializeCurriculumDocument({
        ...document.data,
        absentOptional: undefined,
      }),
    }));
    const card = documents.find((document) => document.path.endsWith('/cards/c1'));
    expect(card?.data.tags).toEqual(['b', 'a']);
    expect(card?.data.crossReferences).toEqual([
      { fromCardId: 'c1', toReference: 'Other 1' },
      { fromCardId: 'c1', toCardId: 'c2', notes: 'see' },
    ]);
    const annotations = card?.data.annotations as Array<{
      annotationId: string;
      sourceTarget: { phrase: string };
      resolvedTarget: { start: number };
    }>;
    expect(annotations.map((item) => item.annotationId)).toEqual(['a2', 'a1']);
    expect(annotations[0]?.sourceTarget.phrase).toBe('beta');
    expect(annotations[0]?.resolvedTarget.start).toBe(6);
    expect(card?.data).not.toHaveProperty('indexCode');
    expect(card?.data).not.toHaveProperty('absentOptional');
    const season = documents.find((document) => document.path.startsWith('seasons/'));
    expect(typeof (season?.data.startDate)).toBe('string');

    const report = diffCurriculum(plan, { seasonId: plan.seasonId, documents });
    expect(report.counts).toEqual({
      CREATE: 0,
      UPDATE: 0,
      DELETE: 0,
      UNCHANGED: plan.documents.length,
    });
  });

  it('rejects null and non-plain values', () => {
    expect(() => serializeCurriculumDocument({ name: null })).toThrow(CurriculumSerializationError);
    expect(() => serializeCurriculumDocument({ when: new Date('2099-01-01') })).toThrow(/Date/);
    expect(() => serializeCurriculumDocument({ stamp: { _seconds: 1, _nanoseconds: 0 } })).toThrow(/Timestamp/);
    expect(() => serializeCurriculumDocument({ stamp: { toDate: () => new Date() } })).toThrow(/Timestamp/);
    expect(() => serializeCurriculumDocument({ sentinel: { _methodName: 'serverTimestamp' } })).toThrow(/sentinel/);
    class FieldValue {}
    expect(() => serializeCurriculumDocument({ sentinel: new FieldValue() })).toThrow(/sentinel/);
    expect(() => serializeCurriculumDocument({ fn: () => undefined })).toThrow(/function/);
    expect(() => serializeCurriculumDocument({ big: BigInt(1) })).toThrow(/bigint/);
    expect(() => serializeCurriculumDocument({ mark: Symbol('x') })).toThrow(/symbol/);
  });
});
