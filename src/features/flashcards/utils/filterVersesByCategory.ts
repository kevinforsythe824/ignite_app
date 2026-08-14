import type { Card } from '../domain/card';
import type { CategoryFilterId } from '../types/settings';

/**
 * Normalized tag/rule needles for each category filter.
 * Matching is substring-based after lowercasing and stripping trailing periods.
 */
const CATEGORY_MATCHERS: Readonly<Record<CategoryFilterId, readonly string[]>> = {
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

function labelMatchesCategory(label: string, filterId: CategoryFilterId): boolean {
  const normalized = normalizeLabel(label);
  return CATEGORY_MATCHERS[filterId].some(
    (needle) =>
      normalized === needle ||
      normalized.startsWith(`${needle}.`) ||
      normalized.startsWith(needle),
  );
}

/** True when the card's tags or matched rules hit the given category. */
export function verseMatchesCategory(card: Card, filterId: CategoryFilterId): boolean {
  for (const tag of card.tags) {
    if (labelMatchesCategory(tag, filterId)) {
      return true;
    }
  }

  for (const rule of card.matchedRules) {
    if (labelMatchesCategory(rule.ruleName, filterId)) {
      return true;
    }
  }

  return false;
}

/**
 * Filters cards by selected categories (union). Empty filters return the
 * original order unchanged.
 */
export function filterVersesByCategory(
  cards: readonly Card[],
  categoryFilters: readonly CategoryFilterId[],
): Card[] {
  if (categoryFilters.length === 0) {
    return [...cards];
  }

  return cards.filter((card) =>
    categoryFilters.some((filterId) => verseMatchesCategory(card, filterId)),
  );
}
