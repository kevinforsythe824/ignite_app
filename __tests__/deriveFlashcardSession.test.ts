import {
  countAnsweredStatuses,
  deriveFlashcardSession,
} from '../src/features/flashcards/state/deriveFlashcardSession';
import { DEFAULT_FLASHCARD_SETTINGS } from '../src/features/flashcards/types/settings';
import type { FlashcardDeck, Verse } from '../src/features/flashcards/types/verse';

const verses: Verse[] = [
  {
    id: 'v1',
    reference: 'Test 1:1',
    verse_text: 'One.',
    index_code: '001',
    matched_rules: [],
    tags: [],
  },
  {
    id: 'v2',
    reference: 'Test 1:2',
    verse_text: 'Two.',
    index_code: '002',
    matched_rules: [],
    tags: [],
  },
  {
    id: 'v3',
    reference: 'Test 1:3',
    verse_text: 'Three.',
    index_code: '003',
    matched_rules: [],
    tags: [],
  },
];

const deck: FlashcardDeck = {
  deckId: 'derive-deck',
  title: 'Derive Deck',
  verses,
};

describe('countAnsweredStatuses', () => {
  it('counts only mastered and practicing entries', () => {
    expect(
      countAnsweredStatuses({
        v1: 'mastered',
        v2: 'practicing',
        v3: 'mastered',
      }),
    ).toEqual({
      masteredCount: 2,
      practicingCount: 1,
    });
  });

  it('returns zeros for an empty status map', () => {
    expect(countAnsweredStatuses({})).toEqual({
      masteredCount: 0,
      practicingCount: 0,
    });
  });
});

describe('deriveFlashcardSession', () => {
  it('exposes the current verse and 1-based card number', () => {
    const view = deriveFlashcardSession(
      deck,
      {
        currentIndex: 1,
        statusById: { v1: 'mastered' },
        activeVerseIds: null,
      },
      DEFAULT_FLASHCARD_SETTINGS,
    );

    expect(view.currentVerse?.id).toBe('v2');
    expect(view.currentCardNumber).toBe(2);
    expect(view.totalCards).toBe(3);
    expect(view.progress).toBeCloseTo(2 / 3);
    expect(view.currentStatus).toBe('unseen');
    expect(view.showCard).toBe(true);
    expect(view.isComplete).toBe(false);
    expect(view.settings).toEqual(DEFAULT_FLASHCARD_SETTINGS);
  });

  it('marks the session complete when every card is answered', () => {
    const view = deriveFlashcardSession(
      deck,
      {
        currentIndex: 3,
        statusById: {
          v1: 'mastered',
          v2: 'practicing',
          v3: 'mastered',
        },
        activeVerseIds: null,
      },
      DEFAULT_FLASHCARD_SETTINGS,
    );

    expect(view.answeredCount).toBe(3);
    expect(view.masteredCount).toBe(2);
    expect(view.practicingCount).toBe(1);
    expect(view.currentVerse).toBeUndefined();
    expect(view.currentCardNumber).toBe(3);
    expect(view.progress).toBe(1);
    expect(view.isComplete).toBe(true);
    expect(view.showCard).toBe(false);
  });

  it('marks complete when index is past the end even before counts catch up', () => {
    const view = deriveFlashcardSession(
      deck,
      {
        currentIndex: 3,
        statusById: {
          v1: 'mastered',
          v2: 'practicing',
        },
        activeVerseIds: null,
      },
      DEFAULT_FLASHCARD_SETTINGS,
    );

    expect(view.currentVerse).toBeUndefined();
    expect(view.isComplete).toBe(true);
    expect(view.showCard).toBe(false);
  });

  it('uses activeVerseIds order and only counts those answers', () => {
    const view = deriveFlashcardSession(
      deck,
      {
        currentIndex: 0,
        statusById: {
          v1: 'mastered',
          v2: 'practicing',
          v3: 'mastered',
        },
        activeVerseIds: ['v3', 'v1'],
      },
      DEFAULT_FLASHCARD_SETTINGS,
    );

    expect(view.verses.map((verse) => verse.id)).toEqual(['v3', 'v1']);
    expect(view.currentVerse?.id).toBe('v3');
    expect(view.totalCards).toBe(2);
    expect(view.masteredCount).toBe(2);
    expect(view.practicingCount).toBe(0);
    expect(view.answeredCount).toBe(2);
    expect(view.isComplete).toBe(true);
    expect(view.showCard).toBe(false);
  });

  it('completes a filtered active deck when its cards are all answered', () => {
    const view = deriveFlashcardSession(
      deck,
      {
        currentIndex: 2,
        statusById: {
          v1: 'mastered',
          v3: 'practicing',
        },
        activeVerseIds: ['v1', 'v3'],
      },
      {
        ...DEFAULT_FLASHCARD_SETTINGS,
        categoryFilters: ['uniqueBeginning'],
      },
    );

    expect(view.totalCards).toBe(2);
    expect(view.answeredCount).toBe(2);
    expect(view.currentVerse).toBeUndefined();
    expect(view.isComplete).toBe(true);
    expect(view.showCard).toBe(false);
  });

  it('treats an empty active list as empty — not complete', () => {
    const view = deriveFlashcardSession(
      deck,
      {
        currentIndex: 0,
        statusById: { v1: 'mastered' },
        activeVerseIds: [],
      },
      {
        ...DEFAULT_FLASHCARD_SETTINGS,
        categoryFilters: ['question'],
      },
    );

    expect(view.totalCards).toBe(0);
    expect(view.currentVerse).toBeUndefined();
    expect(view.isComplete).toBe(false);
    expect(view.showCard).toBe(false);
  });

  it('handles an empty deck safely', () => {
    const emptyDeck: FlashcardDeck = {
      deckId: 'empty',
      title: 'Empty',
      verses: [],
    };

    const view = deriveFlashcardSession(
      emptyDeck,
      {
        currentIndex: 0,
        statusById: {},
        activeVerseIds: null,
      },
      DEFAULT_FLASHCARD_SETTINGS,
    );

    expect(view.currentVerse).toBeUndefined();
    expect(view.currentCardNumber).toBe(0);
    expect(view.progress).toBe(0);
    expect(view.isComplete).toBe(false);
    expect(view.showCard).toBe(false);
  });
});
