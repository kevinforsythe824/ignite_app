import {
  countAnsweredStatuses,
  deriveFlashcardSession,
} from '../src/features/flashcards/state/deriveFlashcardSession';
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
    const view = deriveFlashcardSession(deck, {
      currentIndex: 1,
      statusById: { v1: 'mastered' },
    });

    expect(view.currentVerse?.id).toBe('v2');
    expect(view.currentCardNumber).toBe(2);
    expect(view.totalCards).toBe(3);
    expect(view.progress).toBeCloseTo(2 / 3);
    expect(view.currentStatus).toBe('unseen');
    expect(view.showCard).toBe(true);
    expect(view.isComplete).toBe(false);
  });

  it('marks the session complete when every card is answered', () => {
    const view = deriveFlashcardSession(deck, {
      currentIndex: 2,
      statusById: {
        v1: 'mastered',
        v2: 'practicing',
        v3: 'mastered',
      },
    });

    expect(view.answeredCount).toBe(3);
    expect(view.masteredCount).toBe(2);
    expect(view.practicingCount).toBe(1);
    expect(view.isComplete).toBe(true);
    expect(view.showCard).toBe(false);
  });

  it('handles an empty deck safely', () => {
    const emptyDeck: FlashcardDeck = {
      deckId: 'empty',
      title: 'Empty',
      verses: [],
    };

    const view = deriveFlashcardSession(emptyDeck, {
      currentIndex: 0,
      statusById: {},
    });

    expect(view.currentVerse).toBeUndefined();
    expect(view.currentCardNumber).toBe(0);
    expect(view.progress).toBe(0);
    expect(view.isComplete).toBe(false);
    expect(view.showCard).toBe(false);
  });
});
