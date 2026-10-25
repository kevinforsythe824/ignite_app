/**
 * @jest-environment node
 */
import { mapFirestoreCardToDomain } from '../../src/features/flashcards/data/mapFirestoreToCard';
import {
  CONTENT_SCHEMA_VERSION,
  OFFICIAL_CONTENT_SCHEMA_VERSION,
} from '../../scripts/content-pipeline/constants';
import { convertWorkbooksToPackage } from '../../scripts/content-pipeline/convert';
import { serializeCurriculumDocument } from '../../scripts/content-import/serializeCurriculumDocument';
import { planImportDocuments } from '../../scripts/content-import/planDocuments';
import type { LoadedContentPackage } from '../../scripts/content-import/loadPackage';
import { buildSyntheticWorkbook, buildAllSyntheticWorkbooks } from '../../scripts/content-pipeline/syntheticData';
import type { ContentAnnotationRecord, ContentPackage } from '../../scripts/content-pipeline/types';
import { validateContentPackage } from '../../scripts/content-pipeline/validatePackage';
import { validateSourceWorkbook } from '../../scripts/content-pipeline/validateSource';

function syntheticPackage(): ContentPackage {
  const converted = convertWorkbooksToPackage(buildAllSyntheticWorkbooks());
  if (!converted.content) {
    throw new Error(converted.errors.map((item) => item.reason).join('\n'));
  }
  return converted.content;
}

function frequencyAnnotations(content: ContentPackage): ContentAnnotationRecord[] {
  return content.materialSets.flatMap((materialSet) =>
    materialSet.cards.flatMap((card) => card.annotations.filter((annotation) => annotation.type === 'frequency')),
  );
}

function withOfficialTiers(content: ContentPackage, tier = 3): ContentPackage {
  content.schemaVersion = OFFICIAL_CONTENT_SCHEMA_VERSION;
  for (const annotation of frequencyAnnotations(content)) {
    annotation.frequencyTier = tier;
  }
  return content;
}

describe('content schema 1.0.0 and 1.1.0', () => {
  it('keeps synthetic packages on schema 1.0.0 without a required frequency tier', () => {
    const content = syntheticPackage();
    expect(content.schemaVersion).toBe(CONTENT_SCHEMA_VERSION);
    expect(content.schemaVersion).toBe('1.0.0');
    expect(validateContentPackage(content)).toEqual([]);
    const annotations = content.materialSets.flatMap((materialSet) =>
      materialSet.cards.flatMap((card) => card.annotations),
    );
    expect(annotations.some((annotation) => annotation.type === 'frequency')).toBe(true);
    for (const annotation of annotations) {
      expect(annotation).not.toHaveProperty('frequencyTier');
    }
  });

  it('rejects an unsupported schema version', () => {
    const content = syntheticPackage();
    content.schemaVersion = '9.9.9';
    expect(validateContentPackage(content).some((item) => item.code === 'unsupported_schema_version')).toBe(
      true,
    );
  });

  it('requires frequencyTier 1 through 5 on schema 1.1.0 frequency annotations', () => {
    const missing = syntheticPackage();
    missing.schemaVersion = OFFICIAL_CONTENT_SCHEMA_VERSION;
    expect(validateContentPackage(missing).some((item) => item.code === 'missing_frequency_tier')).toBe(true);

    for (const tier of [1, 2, 3, 4, 5]) {
      const content = withOfficialTiers(syntheticPackage(), tier);
      const card = content.materialSets[0]?.cards[0];
      if (!card) {
        throw new Error('expected a synthetic card');
      }
      card.studyContext = {
        battlefield: tier,
        topic: 'Hope',
        thematicQuestion: 'What remains?',
      };
      expect(validateContentPackage(content)).toEqual([]);
    }

    for (const tier of [0, 6, 1.5, '3']) {
      const content = withOfficialTiers(syntheticPackage());
      const annotation = frequencyAnnotations(content)[0];
      if (!annotation) {
        throw new Error('expected a frequency annotation');
      }
      (annotation as { frequencyTier: unknown }).frequencyTier = tier;
      expect(validateContentPackage(content).some((item) => item.code === 'invalid_frequency_tier')).toBe(
        true,
      );
    }
  });

  it('rejects a frequency tier on a non-frequency annotation', () => {
    const content = withOfficialTiers(syntheticPackage());
    const annotation = content.materialSets
      .flatMap((materialSet) => materialSet.cards.flatMap((card) => card.annotations))
      .find((item) => item.type !== 'frequency');
    if (!annotation) {
      throw new Error('expected a non-frequency annotation');
    }
    annotation.frequencyTier = 1;
    expect(validateContentPackage(content).some((item) => item.code === 'unexpected_frequency_tier')).toBe(
      true,
    );

    const workbook = buildSyntheticWorkbook('intermediate');
    expect(validateSourceWorkbook(workbook)).toEqual([]);
    const highlight = workbook.annotations.find((item) => item.type === 'highlight');
    if (!highlight) {
      throw new Error('expected a highlight annotation');
    }
    highlight.frequencyTier = 2;
    expect(
      validateSourceWorkbook(workbook).some((item) => item.code === 'unexpected_frequency_tier'),
    ).toBe(true);
  });

  it('rejects malformed studyContext and accepts a 1.1.0 round trip', () => {
    const malformed = withOfficialTiers(syntheticPackage());
    const card = malformed.materialSets[0]?.cards[0];
    if (!card) {
      throw new Error('expected a card');
    }
    const cases: unknown[] = [
      null,
      [],
      { battlefield: null },
      { battlefield: '' },
      { topic: '' },
      { battlefield: Number.NaN },
      { topic: 'Hope', questionHint: 'quiz' },
    ];
    for (const studyContext of cases) {
      (card as { studyContext: unknown }).studyContext = studyContext;
      expect(validateContentPackage(malformed).some((item) => item.code === 'invalid_study_context')).toBe(
        true,
      );
    }

    const content = withOfficialTiers(syntheticPackage(), 5);
    const annotated = content.materialSets
      .flatMap((materialSet) => materialSet.cards)
      .find((item) => item.annotations.some((annotation) => annotation.type === 'frequency'));
    if (!annotated) {
      throw new Error('expected an annotated card');
    }
    annotated.studyContext = { battlefield: 'North', topic: 'Watch', thematicQuestion: 'Who watches?' };
    expect(validateContentPackage(content)).toEqual([]);
    for (const annotation of content.materialSets.flatMap((materialSet) =>
      materialSet.cards.flatMap((item) => item.annotations),
    )) {
      if (annotation.type !== 'frequency') {
        expect(annotation).not.toHaveProperty('frequencyTier');
      }
    }

    const loaded: LoadedContentPackage = {
      packageDir: 'fixture',
      content,
      fingerprint: 'fixture-fingerprint',
      manifest: {
        schemaVersion: content.schemaVersion,
        seasonId: content.season.seasonId,
        sourceVersion: content.sourceVersion,
        converterVersion: '1.0.0',
        materialSets: [],
        cardCounts: { total: 1, byMaterialSet: {} },
        fingerprint: 'fixture-fingerprint',
        validationStatus: 'passed',
        generatedAt: 'planned-at-import',
      },
    };
    const plan = planImportDocuments(loaded);
    const document = plan.documents.find(
      (item) =>
        item.path ===
        `seasons/${annotated.seasonId}/materialSets/${annotated.materialSetId}/cards/${annotated.cardId}`,
    );
    if (!document) {
      throw new Error('expected a planned card');
    }
    const serialized = serializeCurriculumDocument(document.data);
    expect(serialized.studyContext).toEqual({
      battlefield: 'North',
      topic: 'Watch',
      thematicQuestion: 'Who watches?',
    });
    const annotations = serialized.annotations as Array<{ type: string; frequencyTier?: number }>;
    expect(annotations.find((item) => item.type === 'frequency')?.frequencyTier).toBe(5);
    for (const annotation of annotations) {
      if (annotation.type !== 'frequency') {
        expect(annotation).not.toHaveProperty('frequencyTier');
      }
    }

    const mapped = mapFirestoreCardToDomain(
      serialized,
      annotated.seasonId,
      annotated.materialSetId,
      annotated.cardId,
    );
    expect(mapped.studyContext).toEqual(annotated.studyContext);
    expect(typeof mapped.studyContext?.battlefield).toBe('string');
    expect(mapped.annotations?.find((item) => item.type === 'frequency')?.frequencyTier).toBe(5);
    for (const annotation of mapped.annotations ?? []) {
      if (annotation.type !== 'frequency') {
        expect(annotation).not.toHaveProperty('frequencyTier');
      }
    }
    expect(mapped.quizMetadata?.questionHint).not.toBe('Who watches?');
  });

  it('fails source validation when a 1.1.0 frequency annotation omits its tier', () => {
    const workbook = buildSyntheticWorkbook('intermediate');
    workbook.package = { ...workbook.package, schemaVersion: OFFICIAL_CONTENT_SCHEMA_VERSION };
    expect(validateSourceWorkbook(workbook).some((item) => item.code === 'missing_frequency_tier')).toBe(
      true,
    );
    for (const annotation of workbook.annotations) {
      if (annotation.type === 'frequency') {
        annotation.frequencyTier = 4;
      }
    }
    expect(validateSourceWorkbook(workbook)).toEqual([]);
  });
});
