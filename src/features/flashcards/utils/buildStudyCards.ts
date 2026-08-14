import { shuffleArray } from '../../../shared/utils/shuffleArray';
import type { Card } from '../domain/card';
import type { FlashcardSettings } from '../types/settings';
import { filterCardsByCategory } from './filterCardsByCategory';

/**
 * Builds the active study list from curriculum cards + settings.
 * Filter first (union of selected categories), then optionally shuffle.
 */
export function buildStudyCards(
  cards: readonly Card[],
  settings: Pick<FlashcardSettings, 'categoryFilters' | 'shuffleCards'>,
): Card[] {
  const filtered = filterCardsByCategory(cards, settings.categoryFilters);
  return settings.shuffleCards ? shuffleArray(filtered) : filtered;
}

/** Resolves an ordered id list against the curriculum, dropping unknown ids. */
export function resolveCardsByIds(
  cards: readonly Card[],
  orderedIds: readonly string[],
): Card[] {
  const byId = new Map(cards.map((card) => [card.cardId, card]));
  const resolved: Card[] = [];

  for (const id of orderedIds) {
    const card = byId.get(id);
    if (card !== undefined) {
      resolved.push(card);
    }
  }

  return resolved;
}
