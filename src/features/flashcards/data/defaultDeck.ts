import mockVerseData from '../../../data/mock-verse-data.json';
import type { FlashcardDeck, Verse } from '../types/verse';

/** Bundled Luke 2 mock deck used until Study Hub streams from Firebase. */
export const DEFAULT_DECK: FlashcardDeck = {
  deckId: 'luke-2',
  title: 'Luke 2:1-9',
  verses: mockVerseData as Verse[],
};
