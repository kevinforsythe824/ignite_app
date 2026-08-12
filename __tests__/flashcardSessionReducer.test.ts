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
      activeVerseIds: null,
    });
  });

  it('records a correct answer and advances the index', () => {
    const next = flashcardSessionReducer(INITIAL_SESSION_STATE, {
      type: 'answer',
      verseId: 'v1',
      status: 'correct',
      totalCards: threeCardDeck,
    });

    expect(next).toEqual({
      currentIndex: 1,
      statusById: { v1: 'correct' },
      activeVerseIds: null,
    });
  });

  it('records a needs-work answer without dropping earlier statuses', () => {
    const answered = flashcardSessionReducer(INITIAL_SESSION_STATE, {
      type: 'answer',
      verseId: 'v1',
      status: 'correct',
      totalCards: threeCardDeck,
    });

    const next = flashcardSessionReducer(answered, {
      type: 'answer',
      verseId: 'v2',
      status: 'needsWork',
      totalCards: threeCardDeck,
    });

    expect(next.statusById).toEqual({
      v1: 'correct',
      v2: 'needsWork',
    });
    expect(next.currentIndex).toBe(2);
  });

  it('advances past the last card after answering so the session can complete', () => {
    const onLastCard: FlashcardSessionState = {
      currentIndex: 2,
      statusById: { v1: 'correct', v2: 'needsWork' },
      activeVerseIds: null,
    };

    const next = flashcardSessionReducer(onLastCard, {
      type: 'answer',
      verseId: 'v3',
      status: 'correct',
      totalCards: threeCardDeck,
    });

    expect(next.currentIndex).toBe(3);
    expect(next.statusById.v3).toBe('correct');
  });

  it('does not advance past totalCards when answering at the end', () => {
    const pastEnd: FlashcardSessionState = {
      currentIndex: 3,
      statusById: { v1: 'correct', v2: 'needsWork', v3: 'correct' },
      activeVerseIds: null,
    };

    const next = flashcardSessionReducer(pastEnd, {
      type: 'answer',
      verseId: 'v3',
      status: 'needsWork',
      totalCards: threeCardDeck,
    });

    expect(next.currentIndex).toBe(3);
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
      { currentIndex: 2, statusById: {}, activeVerseIds: null },
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

  it('sets an active study order and optionally resets progress', () => {
    const dirty: FlashcardSessionState = {
      currentIndex: 2,
      statusById: { v1: 'correct' },
      activeVerseIds: null,
    };

    const withoutReset = flashcardSessionReducer(dirty, {
      type: 'setActiveOrder',
      verseIds: ['v2', 'v1'],
    });
    expect(withoutReset.activeVerseIds).toEqual(['v2', 'v1']);
    expect(withoutReset.currentIndex).toBe(1);
    expect(withoutReset.statusById).toEqual({ v1: 'correct' });

    const withReset = flashcardSessionReducer(dirty, {
      type: 'setActiveOrder',
      verseIds: ['v3'],
      resetProgress: true,
    });
    expect(withReset).toEqual({
      currentIndex: 0,
      statusById: {},
      activeVerseIds: ['v3'],
    });
  });

  it('resets index and statuses while preserving active order', () => {
    const dirty: FlashcardSessionState = {
      currentIndex: 2,
      statusById: { v1: 'correct', v2: 'needsWork' },
      activeVerseIds: ['v2', 'v1', 'v3'],
    };

    expect(flashcardSessionReducer(dirty, { type: 'reset' })).toEqual({
      currentIndex: 0,
      statusById: {},
      activeVerseIds: ['v2', 'v1', 'v3'],
    });
  });
});
