import {
  clampIndex,
  flashcardSessionReducer,
  INITIAL_SESSION_STATE,
  type FlashcardSessionState,
} from '../src/features/flashcards/state/flashcardSessionReducer';

describe('clampIndex', () => {
  it('returns 0 when the deck is empty', () => {
    expect(clampIndex(5, 0)).toBe(0);
  });

  it('clamps below zero and past the last card', () => {
    expect(clampIndex(-3, 4)).toBe(0);
    expect(clampIndex(99, 4)).toBe(3);
  });

  it('keeps an in-range index unchanged', () => {
    expect(clampIndex(2, 4)).toBe(2);
  });
});

describe('flashcardSessionReducer', () => {
  const threeCardDeck = 3;

  it('starts from the initial session state', () => {
    expect(INITIAL_SESSION_STATE).toEqual({
      currentIndex: 0,
      statusById: {},
    });
  });

  it('records a mastered answer and advances the index', () => {
    const next = flashcardSessionReducer(INITIAL_SESSION_STATE, {
      type: 'answer',
      verseId: 'v1',
      status: 'mastered',
      totalCards: threeCardDeck,
    });

    expect(next).toEqual({
      currentIndex: 1,
      statusById: { v1: 'mastered' },
    });
  });

  it('records a practicing answer without dropping earlier statuses', () => {
    const answered = flashcardSessionReducer(INITIAL_SESSION_STATE, {
      type: 'answer',
      verseId: 'v1',
      status: 'mastered',
      totalCards: threeCardDeck,
    });

    const next = flashcardSessionReducer(answered, {
      type: 'answer',
      verseId: 'v2',
      status: 'practicing',
      totalCards: threeCardDeck,
    });

    expect(next.statusById).toEqual({
      v1: 'mastered',
      v2: 'practicing',
    });
    expect(next.currentIndex).toBe(2);
  });

  it('clamps on the last card after answering', () => {
    const onLastCard: FlashcardSessionState = {
      currentIndex: 2,
      statusById: { v1: 'mastered', v2: 'practicing' },
    };

    const next = flashcardSessionReducer(onLastCard, {
      type: 'answer',
      verseId: 'v3',
      status: 'mastered',
      totalCards: threeCardDeck,
    });

    expect(next.currentIndex).toBe(2);
    expect(next.statusById.v3).toBe('mastered');
  });

  it('moves next and previous within bounds', () => {
    const mid = flashcardSessionReducer(INITIAL_SESSION_STATE, {
      type: 'next',
      totalCards: threeCardDeck,
    });
    expect(mid.currentIndex).toBe(1);

    const stillFirst = flashcardSessionReducer(INITIAL_SESSION_STATE, { type: 'previous' });
    expect(stillFirst.currentIndex).toBe(0);

    const atEnd = flashcardSessionReducer(
      { currentIndex: 2, statusById: {} },
      { type: 'next', totalCards: threeCardDeck },
    );
    expect(atEnd.currentIndex).toBe(2);
  });

  it('jumps to a clamped index', () => {
    const next = flashcardSessionReducer(INITIAL_SESSION_STATE, {
      type: 'goToIndex',
      index: 50,
      totalCards: threeCardDeck,
    });

    expect(next.currentIndex).toBe(2);
    expect(next.statusById).toEqual({});
  });

  it('resets index and statuses', () => {
    const dirty = {
      currentIndex: 2,
      statusById: { v1: 'mastered' as const, v2: 'practicing' as const },
    };

    expect(flashcardSessionReducer(dirty, { type: 'reset' })).toEqual(INITIAL_SESSION_STATE);
  });
});
