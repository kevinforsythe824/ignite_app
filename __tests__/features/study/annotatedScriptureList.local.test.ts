/**
 * @jest-environment node
 *
 * Read-only check of the local official draft. Does not write a package,
 * import content, or print verse text.
 */
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

import type { Card, FrequencyTier } from '../../../src/features/flashcards/domain/card';
import type { StudyCurriculum } from '../../../src/features/flashcards/repositories/curriculumRepository';
import { projectAnnotatedScriptureList } from '../../../src/features/study/domain/projectAnnotatedScriptureList';
import { sortCurriculumSections } from '../../../src/features/season/domain/curriculumSection';
import { segmentOfficialAnnotations } from '../../../src/shared/scripture/segmentOfficialAnnotations';
import { buildOfficialSponsorDraft } from '../../../scripts/content-pipeline/buildOfficialSponsorDraft';
import { fingerprintContent } from '../../../scripts/content-pipeline/fingerprint';
import { WPFBQ_2027_SPONSOR_PROFILE } from '../../../scripts/content-pipeline/sponsorSourceProfile';
import type { ContentCardRecord, ContentMaterialSetRecord } from '../../../scripts/content-pipeline/types';

const LOCAL_DIR = path.join('content', 'authoring', 'local');
const WORKBOOKS_PRESENT = WPFBQ_2027_SPONSOR_PROFILE.sources.every((source) =>
  existsSync(path.join(LOCAL_DIR, source.fileName)),
);
const PACKAGE_FILES = [
  'content/packages/dev-synthetic-s3/content.json',
  'content/packages/dev-synthetic-s3/manifest.json',
  'content/packages/dev-synthetic-s3/validation-report.json',
];
const WORKBOOK_FILES = WPFBQ_2027_SPONSOR_PROFILE.sources.map((source) =>
  path.join(LOCAL_DIR, source.fileName),
);

const EXPECTED_FINGERPRINT =
  '7e743ca174ba6a24d0ff454e1bb754e3fd981bc561b7e84d9f88fb59e31a05dc';

const PROVISIONAL_LOCAL_TEST_SEASON_DATES = {
  startDate: '2027-01-01',
  endDate: '2027-08-31',
} as const;

function toStudyCard(record: ContentCardRecord): Card {
  return {
    seasonId: record.seasonId,
    materialSetId: record.materialSetId,
    cardId: record.cardId,
    cardNumber: record.cardNumber,
    reference: record.reference,
    verseText: record.verseText,
    sectionId: record.sectionId,
    matchedRules: [],
    tags: [...record.tags],
    annotations: record.annotations.map((annotation) => ({
      annotationId: annotation.annotationId,
      cardId: annotation.cardId,
      type: annotation.type,
      sourceTarget: {
        strategy: annotation.sourceTarget.strategy,
        phrase: annotation.sourceTarget.phrase,
        occurrenceIndex: annotation.sourceTarget.occurrenceIndex,
      },
      resolvedTarget: {
        start: annotation.resolvedTarget.start,
        end: annotation.resolvedTarget.end,
      },
      ...(annotation.notes === undefined ? {} : { notes: annotation.notes }),
      ...(annotation.frequencyTier === undefined
        ? {}
        : { frequencyTier: annotation.frequencyTier as FrequencyTier }),
    })),
    ...(record.studyContext === undefined ? {} : { studyContext: record.studyContext }),
  };
}

function toCurriculum(materialSet: ContentMaterialSetRecord): StudyCurriculum {
  return {
    seasonId: materialSet.seasonId,
    materialSetId: materialSet.materialSetId,
    title: materialSet.displayName,
    cards: materialSet.cards.map(toStudyCard),
    sections: materialSet.sections,
  };
}

function fileStamps(files: readonly string[]): number[] {
  return files.filter((file) => existsSync(file)).map((file) => statSync(file).mtimeMs);
}

(WORKBOOKS_PRESENT ? describe : describe.skip)('official annotated scripture list projection', () => {
  jest.setTimeout(180000);

  it('projects every official card once, in section order, without changing scripture', async () => {
    const packageBefore = fileStamps(PACKAGE_FILES);
    const workbookBefore = fileStamps(WORKBOOK_FILES);
    const draft = await buildOfficialSponsorDraft({
      directory: LOCAL_DIR,
      seasonDates: PROVISIONAL_LOCAL_TEST_SEASON_DATES,
    });
    expect(draft.status).toBe('passed');
    const content = draft.pipeline.content;
    if (!content) {
      throw new Error('Official draft did not produce a package.');
    }
    const fingerprintBefore = fingerprintContent(content);

    const curricula = content.materialSets.map(toCurriculum);
    const projectedCards: Card[] = [];
    const sectionCounts: Record<string, number> = {};

    for (const curriculum of curricula) {
      const projection = projectAnnotatedScriptureList(curriculum);
      expect(projection.ok).toBe(true);
      if (!projection.ok) {
        return;
      }
      sectionCounts[curriculum.materialSetId] = projection.sections.length;
      expect(projection.sections.map((entry) => entry.section.sectionId)).toEqual(
        sortCurriculumSections(curriculum.sections).map((section) => section.sectionId),
      );

      const seen = new Set<string>();
      for (const entry of projection.sections) {
        expect(entry.section.title.length).toBeGreaterThan(0);
        expect(entry.section.title).not.toBe('Miscellaneous');
        expect(entry.cards.map((item) => item.cardId)).toEqual([...entry.section.cardIds]);
        for (const card of entry.cards) {
          const source = curriculum.cards.find(
            (item) =>
              item.cardId === card.cardId &&
              item.materialSetId === card.materialSetId &&
              item.seasonId === card.seasonId,
          );
          expect(source).toBe(card);
          expect(card.materialSetId).toBe(curriculum.materialSetId);
          expect(card.seasonId).toBe(curriculum.seasonId);
          expect(card.sectionId).toBe(entry.section.sectionId);
          expect(card.verseText).toBe(source?.verseText);
          expect(card.reference).toBe(source?.reference);
          expect(card.annotations).toBe(source?.annotations);
          expect(seen.has(card.cardId)).toBe(false);
          seen.add(card.cardId);

          const segmentation = segmentOfficialAnnotations({
            verseText: card.verseText,
            annotations: card.annotations,
            cardId: card.cardId,
          });
          const joined = segmentation.runs.map((run) => run.text).join('');
          if (joined !== card.verseText || segmentation.canonicalText !== card.verseText) {
            throw new Error(
              `${card.materialSetId} card ${card.cardNumber} canonical length ${segmentation.canonicalText.length} joined length ${joined.length} verse length ${card.verseText.length}`,
            );
          }
          if (segmentation.diagnostics.length > 0) {
            throw new Error(
              `${card.materialSetId} card ${card.cardNumber} diagnostics ${segmentation.diagnostics
                .map((item) => item.code)
                .join(',')}`,
            );
          }
          projectedCards.push(card);
        }
      }
      expect(seen.size).toBe(curriculum.cards.length);
    }

    expect(sectionCounts).toEqual({
      'cadet-2027': 7,
      'beginner-2027': 7,
      'junior-2027': 7,
      'intermediate-2027': 7,
      'experienced-2027': 7,
    });
    expect(Object.values(sectionCounts).reduce((sum, count) => sum + count, 0)).toBe(35);
    expect(projectedCards).toHaveLength(1234);
    expect(
      projectedCards.reduce((sum, card) => sum + (card.annotations?.length ?? 0), 0),
    ).toBe(8088);
    expect(
      projectedCards.reduce((sum, card) => {
        return (
          sum +
          segmentOfficialAnnotations({
            verseText: card.verseText,
            annotations: card.annotations,
            cardId: card.cardId,
          }).indicators.length
        );
      }, 0),
    ).toBe(5620);

    const intermediate = projectedCards.filter((card) => card.materialSetId === 'intermediate-2027');
    const experienced = projectedCards.filter((card) => card.materialSetId === 'experienced-2027');
    const sharedIds = intermediate
      .map((card) => card.cardId)
      .filter((cardId) => experienced.some((card) => card.cardId === cardId));
    expect(sharedIds.length).toBeGreaterThan(0);
    for (const cardId of sharedIds) {
      const left = intermediate.find((card) => card.cardId === cardId);
      const right = experienced.find((card) => card.cardId === cardId);
      expect(left).not.toBe(right);
      expect(left?.materialSetId).not.toBe(right?.materialSetId);
      expect(left?.annotations).not.toBe(right?.annotations);
    }

    expect(fingerprintContent(content)).toBe(fingerprintBefore);
    expect(fingerprintBefore).toBe(EXPECTED_FINGERPRINT);
    expect(fileStamps(PACKAGE_FILES)).toEqual(packageBefore);
    expect(fileStamps(WORKBOOK_FILES)).toEqual(workbookBefore);
  });
});
