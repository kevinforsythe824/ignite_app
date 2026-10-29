import { shuffleArray } from '../../../shared/utils/shuffleArray';
import type { Card } from '../domain/card';
import {
  DEFAULT_SCRIPTURE_PRESENTATION,
  type ScripturePresentationMode,
} from '../scripturePresentation';
import type { FlashcardSettings } from '../types/settings';
import { filterCardsByCategory } from './filterCardsByCategory';

/**
 * Builds the active study list from an already scoped card list.
 * Callers scope MaterialSet, then an optional section, before this runs.
 * Category filters (union) are next, then optional shuffle.
 */
export function buildStudyCards(
  cards: readonly Card[],
  settings: Pick<FlashcardSettings, 'categoryFilters' | 'shuffleCards'>,
  presentation: ScripturePresentationMode = DEFAULT_SCRIPTURE_PRESENTATION,
): Card[] {
  const filtered = filterCardsByCategory(cards, settings.categoryFilters, presentation);
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
