import type { Card } from '../src/features/flashcards/domain/card';
import { TEST_SEASON_ID } from '../src/features/flashcards/domain/testSeason';
import {
  countAnsweredStatuses,
  deriveFlashcardSession,
} from '../src/features/flashcards/state/deriveFlashcardSession';
import { DEFAULT_FLASHCARD_SETTINGS } from '../src/features/flashcards/types/settings';

const cards: Card[] = [
  {
    seasonId: TEST_SEASON_ID,
    cardId: 'v1',
    cardNumber: 1,
    reference: 'Test 1:1',
    verseText: 'One.',
    indexCode: '001',
    matchedRules: [],
    tags: [],
  },
  {
    seasonId: TEST_SEASON_ID,
    cardId: 'v2',
    cardNumber: 2,
    reference: 'Test 1:2',
    verseText: 'Two.',
    indexCode: '002',
    matchedRules: [],
    tags: [],
  },
  {
    seasonId: TEST_SEASON_ID,
    cardId: 'v3',
    cardNumber: 3,
    reference: 'Test 1:3',
    verseText: 'Three.',
    indexCode: '003',
    matchedRules: [],
    tags: [],
  },
];

const curriculum = {
  seasonId: TEST_SEASON_ID,
  title: 'Derive Deck',
  cards,
};

describe('countAnsweredStatuses', () => {
  it('counts only correct and needsWork entries', () => {
    expect(
      countAnsweredStatuses({
        v1: 'correct',
        v2: 'needsWork',
        v3: 'correct',
      }),
    ).toEqual({
      correctCount: 2,
      needsWorkCount: 1,
    });
  });

  it('returns zeros for an empty status map', () => {
    expect(countAnsweredStatuses({})).toEqual({
      correctCount: 0,
      needsWorkCount: 0,
    });
  });
});

describe('deriveFlashcardSession', () => {
  it('exposes the current card and 1-based card number', () => {
    const view = deriveFlashcardSession(
      curriculum,
      {
        currentIndex: 1,
        statusById: { v1: 'correct' },
        activeCardIds: null,
      },
      DEFAULT_FLASHCARD_SETTINGS,
    );

    expect(view.currentCard?.cardId).toBe('v2');
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
      curriculum,
      {
        currentIndex: 3,
        statusById: {
          v1: 'correct',
          v2: 'needsWork',
          v3: 'correct',
        },
        activeCardIds: null,
      },
      DEFAULT_FLASHCARD_SETTINGS,
    );

    expect(view.answeredCount).toBe(3);
    expect(view.correctCount).toBe(2);
    expect(view.needsWorkCount).toBe(1);
    expect(view.currentCard).toBeUndefined();
    expect(view.currentCardNumber).toBe(3);
    expect(view.progress).toBe(1);
    expect(view.isComplete).toBe(true);
    expect(view.showCard).toBe(false);
  });

  it('marks complete when index is past the end even before counts catch up', () => {
    const view = deriveFlashcardSession(
      curriculum,
      {
        currentIndex: 3,
        statusById: {
          v1: 'correct',
          v2: 'needsWork',
        },
        activeCardIds: null,
      },
      DEFAULT_FLASHCARD_SETTINGS,
    );

    expect(view.currentCard).toBeUndefined();
    expect(view.isComplete).toBe(true);
    expect(view.showCard).toBe(false);
  });

  it('uses activeCardIds order and only counts those answers', () => {
    const view = deriveFlashcardSession(
      curriculum,
      {
        currentIndex: 0,
        statusById: {
          v1: 'correct',
          v2: 'needsWork',
          v3: 'correct',
        },
        activeCardIds: ['v3', 'v1'],
      },
      DEFAULT_FLASHCARD_SETTINGS,
    );

    expect(view.cards.map((card) => card.cardId)).toEqual(['v3', 'v1']);
    expect(view.currentCard?.cardId).toBe('v3');
    expect(view.totalCards).toBe(2);
    expect(view.correctCount).toBe(2);
    expect(view.needsWorkCount).toBe(0);
    expect(view.answeredCount).toBe(2);
    expect(view.isComplete).toBe(true);
    expect(view.showCard).toBe(false);
  });

  it('completes a filtered active deck when its cards are all answered', () => {
    const view = deriveFlashcardSession(
      curriculum,
      {
        currentIndex: 2,
        statusById: {
          v1: 'correct',
          v3: 'needsWork',
        },
        activeCardIds: ['v1', 'v3'],
      },
      {
        ...DEFAULT_FLASHCARD_SETTINGS,
        categoryFilters: ['uniqueBeginning'],
      },
    );

    expect(view.totalCards).toBe(2);
    expect(view.answeredCount).toBe(2);
    expect(view.currentCard).toBeUndefined();
    expect(view.isComplete).toBe(true);
    expect(view.showCard).toBe(false);
  });

  it('treats an empty active list as empty — not complete', () => {
    const view = deriveFlashcardSession(
      curriculum,
      {
        currentIndex: 0,
        statusById: { v1: 'correct' },
        activeCardIds: [],
      },
      {
        ...DEFAULT_FLASHCARD_SETTINGS,
        categoryFilters: ['question'],
      },
    );

    expect(view.totalCards).toBe(0);
    expect(view.currentCard).toBeUndefined();
    expect(view.isComplete).toBe(false);
    expect(view.showCard).toBe(false);
  });

  it('handles an empty curriculum safely', () => {
    const view = deriveFlashcardSession(
      {
        seasonId: TEST_SEASON_ID,
        title: 'Empty',
        cards: [],
      },
      {
        currentIndex: 0,
        statusById: {},
        activeCardIds: null,
      },
      DEFAULT_FLASHCARD_SETTINGS,
    );

    expect(view.currentCard).toBeUndefined();
    expect(view.currentCardNumber).toBe(0);
    expect(view.progress).toBe(0);
    expect(view.isComplete).toBe(false);
    expect(view.showCard).toBe(false);
  });
});
