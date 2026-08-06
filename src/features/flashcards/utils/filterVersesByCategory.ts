import type { CategoryFilterId } from '../types/settings';
import type { Verse } from '../types/verse';

/**
 * Normalized tag/rule needles for each category filter.
 * Matching is substring-based after lowercasing and stripping trailing periods.
 */
const CATEGORY_MATCHERS: Readonly<Record<CategoryFilterId, readonly string[]>> = {
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
    (needle) => normalized === needle || normalized.startsWith(`${needle}.`) || normalized.startsWith(needle),
  );
}

/** True when the verse's tags or matched rules hit the given category. */
export function verseMatchesCategory(verse: Verse, filterId: CategoryFilterId): boolean {
  for (const tag of verse.tags) {
    if (labelMatchesCategory(tag, filterId)) {
      return true;
    }
  }

  for (const rule of verse.matched_rules) {
    if (labelMatchesCategory(rule.rule_name, filterId)) {
      return true;
    }
  }

  return false;
}

/**
 * Filters verses by selected categories (union). Empty filters return the
 * original order unchanged.
 */
export function filterVersesByCategory(
  verses: readonly Verse[],
  categoryFilters: readonly CategoryFilterId[],
): Verse[] {
  if (categoryFilters.length === 0) {
    return [...verses];
  }

  return verses.filter((verse) =>
    categoryFilters.some((filterId) => verseMatchesCategory(verse, filterId)),
  );
}
