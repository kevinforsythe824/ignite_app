import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { FlashcardSessionProvider } from '../src/features/flashcards/state/FlashcardSessionContext';
import useFlashcards, { type UseFlashcardsResult } from '../src/features/flashcards/hooks/useFlashcards';
import type { FlashcardDeck, Verse } from '../src/features/flashcards/types/verse';

const testVerses: Verse[] = [
  {
    id: 't1',
    reference: 'Test 1:1',
    verse_text: 'First verse.',
    index_code: '001',
    matched_rules: [],
    tags: [],
  },
  {
    id: 't2',
    reference: 'Test 1:2',
    verse_text: 'Second verse.',
    index_code: '002',
    matched_rules: [],
    tags: [],
  },
  {
    id: 't3',
    reference: 'Test 1:3',
    verse_text: 'Third verse.',
    index_code: '003',
    matched_rules: [],
    tags: [],
  },
];

const testDeck: FlashcardDeck = {
  deckId: 'test-deck',
  title: 'Test Deck',
  verses: testVerses,
};

interface SessionController {
  getSession: () => UseFlashcardsResult;
  renderer: ReactTestRenderer;
}

function createSessionController(deck: FlashcardDeck = testDeck): SessionController {
  const sessionRef: { current: UseFlashcardsResult | null } = { current: null };

  function HookProbe(): null {
    sessionRef.current = useFlashcards();
    return null;
  }

  let renderer!: ReactTestRenderer;

  act(() => {
    renderer = TestRenderer.create(
      <FlashcardSessionProvider deck={deck}>
        <HookProbe />
      </FlashcardSessionProvider>,
    );
  });

  return {
    renderer,
    getSession: () => {
      if (sessionRef.current === null) {
        throw new Error('Flashcard session was not initialized');
      }
      return sessionRef.current;
    },
  };
}

describe('FlashcardSessionContext', () => {
  it('starts at index 0 with all cards unseen', () => {
    const { getSession } = createSessionController();
    const session = getSession();

    expect(session.currentIndex).toBe(0);
    expect(session.currentVerse?.reference).toBe('Test 1:1');
    expect(session.currentStatus).toBe('unseen');
    expect(session.isComplete).toBe(false);
  });

  it('marks mastered and advances to the next card', () => {
    const { getSession } = createSessionController();

    act(() => {
      getSession().markMastered();
    });

    const session = getSession();
    expect(session.currentIndex).toBe(1);
    expect(session.statusById.t1).toBe('mastered');
    expect(session.masteredCount).toBe(1);
  });

  it('marks practicing and advances to the next card', () => {
    const { getSession } = createSessionController();

    act(() => {
      getSession().markPracticing();
    });

    const session = getSession();
    expect(session.currentIndex).toBe(1);
    expect(session.statusById.t1).toBe('practicing');
    expect(session.practicingCount).toBe(1);
  });

  it('clamps navigation at deck bounds', () => {
    const { getSession } = createSessionController();

    act(() => {
      getSession().goToPrevious();
    });
    expect(getSession().currentIndex).toBe(0);

    act(() => {
      getSession().goToIndex(99);
    });
    expect(getSession().currentIndex).toBe(2);

    act(() => {
      getSession().goToNext();
    });
    expect(getSession().currentIndex).toBe(2);
  });

  it('resets the session to its initial state', () => {
    const { getSession } = createSessionController();

    act(() => {
      getSession().markMastered();
      getSession().resetSession();
    });

    const session = getSession();
    expect(session.currentIndex).toBe(0);
    expect(session.statusById).toEqual({});
    expect(session.isComplete).toBe(false);
  });

  it('reports completion when every card has been answered', () => {
    const { getSession } = createSessionController();

    act(() => {
      getSession().markMastered();
    });
    act(() => {
      getSession().markPracticing();
    });
    act(() => {
      getSession().markMastered();
    });

    const session = getSession();
    expect(session.isComplete).toBe(true);
    expect(session.answeredCount).toBe(3);
    expect(session.showCard).toBe(false);
  });

  it('exposes parsed segments for the current verse', () => {
    const verseWithKeyword: Verse = {
      ...testVerses[0],
      verse_text: "Remember 'grace' today.",
      matched_rules: [
        {
          rule_name: '1x Keyword',
          rule_category: 'Index',
          notes: "Words marked as 1x frequency (blue highlight): 'grace'",
        },
      ],
    };

    const { getSession } = createSessionController({
      ...testDeck,
      verses: [verseWithKeyword, testVerses[1], testVerses[2]],
    });

    const session = getSession();
    expect(session.currentSegments.length).toBeGreaterThan(0);
    expect(session.currentSegments.some((segment) => segment.content === 'grace')).toBe(true);
    expect(session.showCard).toBe(true);
  });

  it('throws when useFlashcards is used outside the provider', () => {
    function BrokenProbe(): null {
      useFlashcards();
      return null;
    }

    expect(() => {
      act(() => {
        TestRenderer.create(<BrokenProbe />);
      });
    }).toThrow(/FlashcardSessionProvider/);
  });
});
