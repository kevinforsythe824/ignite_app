import type { Card, CardAnnotation, CardMatchedRule, FrequencyTier } from '../src/features/flashcards/domain/card';
import { isFrequencyTier, PHRASE_OCCURRENCE_STRATEGY } from '../src/features/flashcards/domain/card';

export const OFFICIAL_FLASHCARD_SEASON_ID = 'season-study';
export const OFFICIAL_FLASHCARD_MATERIAL_SET_A = 'material-set-a';
export const OFFICIAL_FLASHCARD_MATERIAL_SET_B = 'material-set-b';

export const LEGACY_UNIQUE_BEGINNING: CardMatchedRule = {
  ruleName: 'Unique Beg.',
  ruleCategory: 'Structural',
  notes: "Matches unique beginning phrase: 'Alpha'",
};

export function officialStudyCard(
  overrides: Partial<Card> & Pick<Card, 'cardId' | 'verseText' | 'reference'>,
): Card {
  return {
    seasonId: OFFICIAL_FLASHCARD_SEASON_ID,
    materialSetId: OFFICIAL_FLASHCARD_MATERIAL_SET_A,
    cardNumber: 1,
    matchedRules: [],
    tags: [],
    annotations: [],
    ...overrides,
  };
}

export function officialAnnotation(input: {
  cardId: string;
  annotationId: string;
  type: string;
  start: number;
  end: number;
  frequencyTier?: number;
}): CardAnnotation {
  const annotation: CardAnnotation = {
    annotationId: input.annotationId,
    cardId: input.cardId,
    type: input.type,
    sourceTarget: { strategy: PHRASE_OCCURRENCE_STRATEGY },
    resolvedTarget: { start: input.start, end: input.end },
  };
  if (input.frequencyTier !== undefined && isFrequencyTier(input.frequencyTier)) {
    annotation.frequencyTier = input.frequencyTier;
  }
  return annotation;
}

/** Keeps an out-of-range tier on the object so the segmenter can reject it. */
export function officialAnnotationWithTier(
  input: {
    cardId: string;
    annotationId: string;
    type: string;
    start: number;
    end: number;
  },
  frequencyTier: number,
): CardAnnotation {
  const annotation = officialAnnotation(input);
  return { ...annotation, frequencyTier: frequencyTier as FrequencyTier };
}
