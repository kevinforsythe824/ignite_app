import {
  applicableOfficialMarks,
  type ApplicableOfficialMarks,
} from '../../../shared/scripture/segmentOfficialAnnotations';
import type { Card } from '../domain/card';
import type { ScripturePresentationMode } from '../scripturePresentation';
import {
  categoryFiltersForPresentation,
  isOfficialFrequencyFilterId,
  OFFICIAL_FREQUENCY_FILTER_TIER,
  type CategoryFilterId,
} from '../types/settings';

/**
 * Normalized tag/rule needles for each legacy category filter.
 * Matching is substring-based after lowercasing and stripping trailing periods.
 * Official frequency ids are absent: legacy mode does not read annotations.
 */
const LEGACY_CATEGORY_MATCHERS: Partial<Record<CategoryFilterId, readonly string[]>> = {
  keyword1x: ['1x keyword'],
  keyword2x: ['2x keyword'],
  keyword3x: ['3x keyword'],
  animals: ['animals', 'animal'],
  properName: ['proper name', 'proper names'],
  bodyParts: ['body parts', 'body part'],
  geoLocation: ['geo location', 'geo locations'],
  uniqueBeginning: ['unique beg', 'unique beginning'],
  uniqueEnding: ['unique end', 'unique ending'],
  question: ['question'],
  exclamation: ['exclamation'],
};

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\.+$/, '');
}

function labelMatchesNeedles(label: string, needles: readonly string[]): boolean {
  const normalized = normalizeLabel(label);
  return needles.some(
    (needle) =>
      normalized === needle ||
      normalized.startsWith(`${needle}.`) ||
      normalized.startsWith(needle),
  );
}

function cardMatchesLegacyCategory(card: Card, filterId: CategoryFilterId): boolean {
  const needles = LEGACY_CATEGORY_MATCHERS[filterId];
  if (needles === undefined) {
    return false;
  }

  for (const tag of card.tags) {
    if (labelMatchesNeedles(tag, needles)) {
      return true;
    }
  }

  for (const rule of card.matchedRules) {
    if (labelMatchesNeedles(rule.ruleName, needles)) {
      return true;
    }
  }

  return false;
}

function officialMarksMatch(marks: ApplicableOfficialMarks, filterId: CategoryFilterId): boolean {
  if (filterId === 'uniqueBeginning') {
    return marks.uniqueBeginning;
  }
  if (filterId === 'uniqueEnding') {
    return marks.uniqueEnding;
  }
  if (!isOfficialFrequencyFilterId(filterId)) {
    return false;
  }
  return marks.frequencyTiers.includes(OFFICIAL_FREQUENCY_FILTER_TIER[filterId]);
}

/**
 * Official matches follow `applicableOfficialMarks`, which is the segmentation
 * the renderer paints. Dropped records do not match a category:
 * - invalid, reversed, empty, or out-of-range spans
 * - phrase text that does not equal the verse slice
 * - an annotation whose cardId is not this card
 * - unsupported types
 * - a missing frequency tier, or a tier outside 1–5
 * - a repeated annotationId (every copy of that id is omitted)
 * - frequency annotations whose spans overlap with different tiers (every
 *   frequency annotation in that conflict is omitted; a valid unique beginning
 *   or unique ending on the same card still matches)
 * Overlapping valid marks still match each of their own categories. Official
 * mode does not read tags or matchedRules, and it does not scan verse text.
 */
function cardMatchesOfficialCategory(card: Card, filterId: CategoryFilterId): boolean {
  return officialMarksMatch(
    applicableOfficialMarks({
      verseText: card.verseText,
      annotations: card.annotations,
      cardId: card.cardId,
    }),
    filterId,
  );
}

/** True when the card matches the category for the given presentation mode. */
export function cardMatchesCategory(
  card: Card,
  filterId: CategoryFilterId,
  presentation: ScripturePresentationMode = 'legacy',
): boolean {
  if (presentation === 'official') {
    return cardMatchesOfficialCategory(card, filterId);
  }
  return cardMatchesLegacyCategory(card, filterId);
}

/**
 * Filters cards by selected categories (union). Empty filters, and filters
 * that this presentation does not offer, return the original order unchanged.
 * Official and legacy matchers are not combined.
 */
export function filterCardsByCategory(
  cards: readonly Card[],
  categoryFilters: readonly CategoryFilterId[],
  presentation: ScripturePresentationMode = 'legacy',
): Card[] {
  const activeFilters = categoryFiltersForPresentation(categoryFilters, presentation);
  if (activeFilters.length === 0) {
    return [...cards];
  }

  if (presentation === 'official') {
    return cards.filter((card) => {
      const marks = applicableOfficialMarks({
        verseText: card.verseText,
        annotations: card.annotations,
        cardId: card.cardId,
      });
      return activeFilters.some((filterId) => officialMarksMatch(marks, filterId));
    });
  }

  return cards.filter((card) =>
    activeFilters.some((filterId) => cardMatchesLegacyCategory(card, filterId)),
  );
}
