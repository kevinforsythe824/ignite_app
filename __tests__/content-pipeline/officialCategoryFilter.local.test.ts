/**
 * @jest-environment node
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

import type { Card, FrequencyTier } from '../../src/features/flashcards/domain/card';
import { resolveStudyScope } from '../../src/features/flashcards/domain/resolveStudyScope';
import type { StudyCurriculum } from '../../src/features/flashcards/repositories/curriculumRepository';
import {
  cardMatchesCategory,
  filterCardsByCategory,
} from '../../src/features/flashcards/utils/filterCardsByCategory';
import { segmentOfficialAnnotations } from '../../src/shared/scripture/segmentOfficialAnnotations';
import { buildOfficialSponsorDraft } from '../../scripts/content-pipeline/buildOfficialSponsorDraft';
import { fingerprintContent } from '../../scripts/content-pipeline/fingerprint';
import { WPFBQ_2027_SPONSOR_PROFILE } from '../../scripts/content-pipeline/sponsorSourceProfile';
import type { ContentCardRecord, ContentMaterialSetRecord } from '../../scripts/content-pipeline/types';

const LOCAL_DIR = path.join('content', 'authoring', 'local');
const WORKBOOKS_PRESENT = WPFBQ_2027_SPONSOR_PROFILE.sources.every((source) =>
  existsSync(path.join(LOCAL_DIR, source.fileName)),
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

function indicatorCount(cards: readonly Card[]): number {
  return cards.reduce((sum, card) => {
    return (
      sum +
      segmentOfficialAnnotations({
        verseText: card.verseText,
        annotations: card.annotations,
        cardId: card.cardId,
      }).indicators.length
    );
  }, 0);
}

(WORKBOOKS_PRESENT ? describe : describe.skip)('official 2027 category filters', () => {
  jest.setTimeout(180000);

  it('filters the validated draft without changing scripture or the fingerprint', async () => {
    const draft = await buildOfficialSponsorDraft({
      directory: LOCAL_DIR,
      seasonDates: PROVISIONAL_LOCAL_TEST_SEASON_DATES,
    });
    expect(draft.status).toBe('passed');
    expect(draft.pipeline.report.errors).toEqual([]);
    const content = draft.pipeline.content;
    if (!content) {
      throw new Error('Official draft did not produce a package.');
    }

    const fingerprintBefore = fingerprintContent(content);
    const scriptureBefore = JSON.stringify(
      content.materialSets.map((materialSet) =>
        materialSet.cards.map((card) => ({
          verseText: card.verseText,
          annotations: card.annotations,
        })),
      ),
    );

    const curricula = content.materialSets.map(toCurriculum);
    const allCards = curricula.flatMap((curriculum) => curriculum.cards);
    const cadet = curricula.find((curriculum) => curriculum.materialSetId === 'cadet-2027');
    if (!cadet) {
      throw new Error('Cadet MaterialSet is missing from the official draft.');
    }

    const cadetBeginning = filterCardsByCategory(cadet.cards, ['uniqueBeginning'], 'official');
    const cadetLegacyBeginning = filterCardsByCategory(cadet.cards, ['uniqueBeginning'], 'legacy');
    expect(cadetLegacyBeginning).toHaveLength(0);
    expect(cadetBeginning).toHaveLength(50);
    expect(cadetBeginning.every((card) => card.materialSetId === 'cadet-2027')).toBe(true);
    expect(allCards.every((card) => card.tags.length === 0)).toBe(true);

    const tiers = [1, 2, 3, 4, 5] as const satisfies readonly FrequencyTier[];
    const tierCounts: Record<string, number> = {};
    for (const tier of tiers) {
      const filterId = `frequency${tier}x` as const;
      const matched = filterCardsByCategory(allCards, [filterId], 'official');
      tierCounts[filterId] = matched.length;
      expect(matched.every((card) => cardMatchesCategory(card, filterId, 'official'))).toBe(true);
      expect(new Set(matched.map((card) => `${card.materialSetId}:${card.cardId}`)).size).toBe(
        matched.length,
      );
    }

    const union = filterCardsByCategory(
      cadet.cards,
      ['uniqueBeginning', 'frequency1x'],
      'official',
    );
    expect(new Set(union.map((card) => card.cardId)).size).toBe(union.length);
    expect(union.length).toBeGreaterThan(0);
    expect(union.length).toBeLessThanOrEqual(cadet.cards.length);
    expect(filterCardsByCategory(cadet.cards, [], 'official')).toHaveLength(cadet.cards.length);
    expect(filterCardsByCategory(cadet.cards, ['animals'], 'official')).toHaveLength(
      cadet.cards.length,
    );

    const firstSection = cadet.sections.find((section) => section.cardIds.length > 0);
    if (!firstSection) {
      throw new Error('Cadet has no section with cards.');
    }
    const sectionScope = resolveStudyScope(cadet, firstSection.sectionId);
    expect(sectionScope.status).toBe('ready');
    if (sectionScope.status === 'ready') {
      const sectionFiltered = filterCardsByCategory(
        sectionScope.cards,
        ['uniqueBeginning'],
        'official',
      );
      const sectionIds = new Set(sectionScope.cards.map((card) => card.cardId));
      expect(sectionScope.cards.length).toBeLessThan(cadet.cards.length);
      expect(sectionFiltered.every((card) => sectionIds.has(card.cardId))).toBe(true);
      expect(filterCardsByCategory(sectionScope.cards, [], 'official')).toHaveLength(
        sectionScope.cards.length,
      );
    }

    const endingMatches = filterCardsByCategory(allCards, ['uniqueEnding'], 'official');
    const sourceEndings = allCards.filter((card) =>
      card.annotations?.some((annotation) => annotation.type === 'uniqueEnding'),
    ).length;
    const perMaterialSet = Object.fromEntries(
      curricula.map((curriculum) => [
        curriculum.materialSetId,
        {
          cards: curriculum.cards.length,
          uniqueBeginning: filterCardsByCategory(curriculum.cards, ['uniqueBeginning'], 'official')
            .length,
          uniqueEnding: filterCardsByCategory(curriculum.cards, ['uniqueEnding'], 'official').length,
          frequency1x: filterCardsByCategory(curriculum.cards, ['frequency1x'], 'official').length,
          frequency2x: filterCardsByCategory(curriculum.cards, ['frequency2x'], 'official').length,
          frequency3x: filterCardsByCategory(curriculum.cards, ['frequency3x'], 'official').length,
          frequency4x: filterCardsByCategory(curriculum.cards, ['frequency4x'], 'official').length,
          frequency5x: filterCardsByCategory(curriculum.cards, ['frequency5x'], 'official').length,
        },
      ]),
    );
    expect(perMaterialSet).toEqual({
      'cadet-2027': {
        cards: 50,
        uniqueBeginning: 50,
        uniqueEnding: 50,
        frequency1x: 50,
        frequency2x: 0,
        frequency3x: 0,
        frequency4x: 0,
        frequency5x: 0,
      },
      'beginner-2027': {
        cards: 150,
        uniqueBeginning: 150,
        uniqueEnding: 150,
        frequency1x: 141,
        frequency2x: 0,
        frequency3x: 0,
        frequency4x: 0,
        frequency5x: 0,
      },
      'junior-2027': {
        cards: 250,
        uniqueBeginning: 250,
        uniqueEnding: 250,
        frequency1x: 217,
        frequency2x: 174,
        frequency3x: 136,
        frequency4x: 0,
        frequency5x: 0,
      },
      'intermediate-2027': {
        cards: 392,
        uniqueBeginning: 392,
        uniqueEnding: 392,
        frequency1x: 315,
        frequency2x: 245,
        frequency3x: 182,
        frequency4x: 160,
        frequency5x: 173,
      },
      'experienced-2027': {
        cards: 392,
        uniqueBeginning: 392,
        uniqueEnding: 392,
        frequency1x: 315,
        frequency2x: 245,
        frequency3x: 182,
        frequency4x: 160,
        frequency5x: 173,
      },
    });
    expect(tierCounts).toEqual({
      frequency1x: 1038,
      frequency2x: 664,
      frequency3x: 500,
      frequency4x: 320,
      frequency5x: 346,
    });
    expect(endingMatches).toHaveLength(sourceEndings);
    expect(sourceEndings).toBe(1234);

    expect(allCards).toHaveLength(1234);
    expect(
      allCards.reduce((sum, card) => sum + (card.annotations?.length ?? 0), 0),
    ).toBe(8088);
    expect(indicatorCount(allCards)).toBe(5620);
    expect(fingerprintBefore).toBe(EXPECTED_FINGERPRINT);
    expect(fingerprintContent(content)).toBe(fingerprintBefore);
    expect(draft.pipeline.manifest?.fingerprint).toBe(EXPECTED_FINGERPRINT);
    expect(
      JSON.stringify(
        content.materialSets.map((materialSet) =>
          materialSet.cards.map((card) => ({
            verseText: card.verseText,
            annotations: card.annotations,
          })),
        ),
      ),
    ).toBe(scriptureBefore);
  });
});
