import { shuffleArray } from '../../../shared/utils/shuffleArray';
import type { FlashcardSettings } from '../types/settings';
import type { Verse } from '../types/verse';
import { filterVersesByCategory } from './filterVersesByCategory';

/**
 * Builds the active study list from deck verses + settings.
 * Filter first (union of selected categories), then optionally shuffle.
 */
export function buildStudyVerses(
  verses: readonly Verse[],
  settings: Pick<FlashcardSettings, 'categoryFilters' | 'shuffleCards'>,
): Verse[] {
  const filtered = filterVersesByCategory(verses, settings.categoryFilters);
  return settings.shuffleCards ? shuffleArray(filtered) : filtered;
}

/** Resolves an ordered id list against the deck, dropping unknown ids. */
export function resolveVersesByIds(
  verses: readonly Verse[],
  orderedIds: readonly string[],
): Verse[] {
  const byId = new Map(verses.map((verse) => [verse.id, verse]));
  const resolved: Verse[] = [];

  for (const id of orderedIds) {
    const verse = byId.get(id);
    if (verse !== undefined) {
      resolved.push(verse);
    }
  }

  return resolved;
}
