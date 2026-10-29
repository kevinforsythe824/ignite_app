import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import type { Card } from '../src/features/flashcards/domain/card';
import type { ScripturePresentationMode } from '../src/features/flashcards/scripturePresentation';
import { TEST_MATERIAL_SET_ID, TEST_SEASON_ID } from '../src/features/flashcards/domain/testSeason';
import useFlashcards, {
  type UseFlashcardsResult,
} from '../src/features/flashcards/hooks/useFlashcards';
import { FlashcardSessionProvider } from '../src/features/flashcards/state/FlashcardSessionContext';
import {
  officialAnnotation,
  officialStudyCard,
} from '../test-utils/officialFlashcardFixtures';

const testCards: Card[] = [
  {
    seasonId: TEST_SEASON_ID,
    materialSetId: TEST_MATERIAL_SET_ID,
    cardId: 't1',
    cardNumber: 1,
    reference: 'Test 1:1',
    verseText: 'First verse.',
    indexCode: '001',
    matchedRules: [],
    tags: [],
  },
  {
    seasonId: TEST_SEASON_ID,
    materialSetId: TEST_MATERIAL_SET_ID,
    cardId: 't2',
    cardNumber: 2,
    reference: 'Test 1:2',
    verseText: 'Second verse.',
    indexCode: '002',
    matchedRules: [],
    tags: [],
  },
  {
    seasonId: TEST_SEASON_ID,
    materialSetId: TEST_MATERIAL_SET_ID,
    cardId: 't3',
    cardNumber: 3,
    reference: 'Test 1:3',
    verseText: 'Third verse.',
    indexCode: '003',
    matchedRules: [],
    tags: [],
  },
];

interface SessionController {
  getSession: () => UseFlashcardsResult;
  renderer: ReactTestRenderer;
}

function createSessionController(
  cards: readonly Card[] = testCards,
  scripturePresentation?: ScripturePresentationMode,
): SessionController {
  const sessionRef: { current: UseFlashcardsResult | null } = { current: null };

  function HookProbe(): null {
    sessionRef.current = useFlashcards();
    return null;
  }

  let renderer!: ReactTestRenderer;

  act(() => {
    renderer = TestRenderer.create(
      <FlashcardSessionProvider
        seasonId={TEST_SEASON_ID}
        title="Test Deck"
        cards={cards}
        scripturePresentation={scripturePresentation}
      >
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
    expect(session.currentCard?.reference).toBe('Test 1:1');
    expect(session.currentStatus).toBe('unseen');
    expect(session.isComplete).toBe(false);
  });

  it('marks correct and advances to the next card', () => {
    const { getSession } = createSessionController();

    act(() => {
      getSession().markCorrect();
    });

    const session = getSession();
    expect(session.currentIndex).toBe(1);
    expect(session.statusById.t1).toBe('correct');
    expect(session.correctCount).toBe(1);
  });

  it('marks needs work and advances to the next card', () => {
    const { getSession } = createSessionController();

    act(() => {
      getSession().markNeedsWork();
    });

    const session = getSession();
    expect(session.currentIndex).toBe(1);
    expect(session.statusById.t1).toBe('needsWork');
    expect(session.needsWorkCount).toBe(1);
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
      getSession().markCorrect();
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
      getSession().markCorrect();
    });
    act(() => {
      getSession().markNeedsWork();
    });
    act(() => {
      getSession().markCorrect();
    });

    const session = getSession();
    expect(session.isComplete).toBe(true);
    expect(session.answeredCount).toBe(3);
    expect(session.currentIndex).toBe(3);
    expect(session.currentCard).toBeUndefined();
    expect(session.showCard).toBe(false);
  });

  it('reports completion for a filtered category deck', () => {
    const filteredCards: Card[] = [
      { ...testCards[0], tags: ['Unique Beg.'] },
      { ...testCards[1], tags: ['Questions'] },
      { ...testCards[2], tags: ['Unique Beg.'] },
    ];
    const { getSession } = createSessionController(filteredCards);

    act(() => {
      getSession().toggleCategoryFilter('uniqueBeginning');
    });

    expect(getSession().totalCards).toBe(2);
    expect(getSession().isComplete).toBe(false);

    act(() => {
      getSession().markCorrect();
    });
    act(() => {
      getSession().markNeedsWork();
    });

    const session = getSession();
    expect(session.totalCards).toBe(2);
    expect(session.answeredCount).toBe(2);
    expect(session.currentIndex).toBe(2);
    expect(session.currentCard).toBeUndefined();
    expect(session.isComplete).toBe(true);
    expect(session.showCard).toBe(false);
  });

  it('shows empty — not complete — when filters match no cards', () => {
    const filteredCards: Card[] = [
      { ...testCards[0], tags: ['Unique Beg.'] },
      { ...testCards[1], tags: ['Unique End.'] },
      { ...testCards[2], tags: ['Unique Beg.'] },
    ];
    const { getSession } = createSessionController(filteredCards);

    act(() => {
      getSession().toggleCategoryFilter('question');
    });

    const session = getSession();
    expect(session.totalCards).toBe(0);
    expect(session.isComplete).toBe(false);
    expect(session.showCard).toBe(false);
    expect(session.currentCard).toBeUndefined();
  });

  it('restarts from a completed filtered session', () => {
    const filteredCards: Card[] = [
      { ...testCards[0], tags: ['Unique Beg.'] },
      { ...testCards[1], tags: ['Questions'] },
      { ...testCards[2], tags: ['Unique Beg.'] },
    ];
    const { getSession } = createSessionController(filteredCards);

    act(() => {
      getSession().toggleCategoryFilter('uniqueBeginning');
      getSession().markCorrect();
      getSession().markNeedsWork();
    });
    expect(getSession().isComplete).toBe(true);

    act(() => {
      getSession().restartFlashcards();
    });

    const session = getSession();
    expect(session.isComplete).toBe(false);
    expect(session.currentIndex).toBe(0);
    expect(session.statusById).toEqual({});
    expect(session.totalCards).toBe(2);
    expect(session.showCard).toBe(true);
    expect(session.currentCard?.cardId).toBe('t1');
  });

  it('exposes parsed segments for the current card', () => {
    const cardWithKeyword: Card = {
      ...testCards[0],
      cardId: 't-grace',
      verseText: "Remember 'grace' today.",
      matchedRules: [
        {
          ruleName: '1x Keyword',
          ruleCategory: 'Index',
          notes: "Words marked as 1x frequency (blue highlight): 'grace'",
        },
      ],
    };

    const { getSession } = createSessionController([
      cardWithKeyword,
      testCards[1],
      testCards[2],
    ]);

    const session = getSession();
    expect(session.scripturePresentation).toBe('legacy');
    expect(session.currentSegments.length).toBeGreaterThan(0);
    expect(session.currentSegments.some((segment) => segment.content === 'grace')).toBe(true);
    expect(session.showCard).toBe(true);
  });

  it('skips legacy segments when the session opts into official presentation', () => {
    const cardWithKeyword: Card = {
      ...testCards[0],
      cardId: 't-grace',
      verseText: "Remember 'grace' today.",
      matchedRules: [
        {
          ruleName: '1x Keyword',
          ruleCategory: 'Index',
          notes: "Words marked as 1x frequency (blue highlight): 'grace'",
        },
      ],
      annotations: [],
    };

    const { getSession } = createSessionController([cardWithKeyword], 'official');
    const session = getSession();

    expect(session.scripturePresentation).toBe('official');
    expect(session.currentSegments).toEqual([]);
    expect(session.currentCard?.verseText).toBe("Remember 'grace' today.");
  });

  it('updates settings and rebuilds the study order for category filters', () => {
    const filteredCards: Card[] = [
      { ...testCards[0], tags: ['Unique Beg.'] },
      { ...testCards[1], tags: ['Questions'] },
      { ...testCards[2], tags: ['Unique End.'] },
    ];
    const { getSession } = createSessionController(filteredCards);

    act(() => {
      getSession().toggleCategoryFilter('uniqueBeginning');
    });

    let session = getSession();
    expect(session.settings.categoryFilters).toEqual(['uniqueBeginning']);
    expect(session.totalCards).toBe(1);
    expect(session.currentCard?.cardId).toBe('t1');

    act(() => {
      getSession().setDefaultSide('quote');
      getSession().setShuffleCards(true);
    });

    session = getSession();
    expect(session.settings.defaultSide).toBe('quote');
    expect(session.settings.shuffleCards).toBe(true);
  });

  it('clears all category filters and restores the full deck', () => {
    const filteredCards: Card[] = [
      { ...testCards[0], tags: ['Unique Beg.'] },
      { ...testCards[1], tags: ['Questions'] },
      { ...testCards[2], tags: ['Unique End.'] },
    ];
    const { getSession } = createSessionController(filteredCards);

    act(() => {
      getSession().toggleCategoryFilter('uniqueBeginning');
    });
    act(() => {
      getSession().toggleCategoryFilter('question');
    });

    expect(getSession().settings.categoryFilters).toEqual([
      'uniqueBeginning',
      'question',
    ]);
    expect(getSession().totalCards).toBe(2);

    act(() => {
      getSession().clearCategoryFilters();
    });

    const session = getSession();
    expect(session.settings.categoryFilters).toEqual([]);
    expect(session.totalCards).toBe(3);
  });

  it('restarts flashcards and clears progress', () => {
    const { getSession } = createSessionController();

    act(() => {
      getSession().markCorrect();
      getSession().restartFlashcards();
    });

    const session = getSession();
    expect(session.currentIndex).toBe(0);
    expect(session.statusById).toEqual({});
    expect(session.isComplete).toBe(false);
  });

  it('exposes Correct / Needs Work session APIs, not mastered', () => {
    const { getSession } = createSessionController();
    const session = getSession();

    expect(session).toHaveProperty('correctCount');
    expect(session).toHaveProperty('needsWorkCount');
    expect(session).toHaveProperty('markCorrect');
    expect(session).toHaveProperty('markNeedsWork');
    expect(session).not.toHaveProperty('masteredCount');
    expect(session).not.toHaveProperty('practicingCount');
    expect(session).not.toHaveProperty('markMastered');
    expect(session).not.toHaveProperty('markPracticing');
  });

  it('returns to the first card from the second without clearing the score', () => {
    const { getSession } = createSessionController();

    act(() => {
      getSession().markCorrect();
    });
    expect(getSession().currentCard?.cardId).toBe('t2');
    expect(getSession().canGoPrevious).toBe(true);

    act(() => {
      getSession().goToPrevious();
    });

    const session = getSession();
    expect(session.currentIndex).toBe(0);
    expect(session.currentCard?.cardId).toBe('t1');
    expect(session.statusById).toEqual({ t1: 'correct' });
    expect(session.correctCount).toBe(1);
    expect(session.needsWorkCount).toBe(0);
    expect(session.canGoPrevious).toBe(false);
  });

  it('returns the preceding card from the middle of the active order', () => {
    const { getSession } = createSessionController();

    act(() => {
      getSession().goToNext();
      getSession().goToNext();
    });
    expect(getSession().currentCard?.cardId).toBe('t3');

    act(() => {
      getSession().goToPrevious();
    });

    const session = getSession();
    expect(session.currentIndex).toBe(1);
    expect(session.currentCard?.cardId).toBe('t2');
    expect(session.statusById).toEqual({});
  });

  it('previous follows the shuffled active order and does not reshuffle', () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0);
    const { getSession } = createSessionController();

    act(() => {
      getSession().setShuffleCards(true);
    });

    const order = getSession().cards.map((card) => card.cardId);
    expect(order).toEqual(['t2', 't3', 't1']);

    act(() => {
      getSession().goToIndex(2);
    });
    expect(getSession().currentCard?.cardId).toBe('t1');
    expect(getSession().canGoPrevious).toBe(true);

    act(() => {
      getSession().goToPrevious();
    });

    const session = getSession();
    expect(session.cards.map((card) => card.cardId)).toEqual(order);
    expect(session.currentCard?.cardId).toBe('t3');
    expect(session.currentIndex).toBe(1);
    expect(session.statusById).toEqual({});
    random.mockRestore();
  });

  it('previous stays inside the filtered active sequence', () => {
    const filteredCards: Card[] = [
      { ...testCards[0], tags: ['Unique Beg.'] },
      { ...testCards[1], tags: ['Questions'] },
      { ...testCards[2], tags: ['Unique Beg.'] },
    ];
    const { getSession } = createSessionController(filteredCards);

    act(() => {
      getSession().toggleCategoryFilter('uniqueBeginning');
    });
    expect(getSession().cards.map((card) => card.cardId)).toEqual(['t1', 't3']);
    expect(getSession().canGoPrevious).toBe(false);

    act(() => {
      getSession().markNeedsWork();
    });
    expect(getSession().currentCard?.cardId).toBe('t3');

    act(() => {
      getSession().goToPrevious();
    });

    const session = getSession();
    expect(session.cards.map((card) => card.cardId)).toEqual(['t1', 't3']);
    expect(session.currentCard?.cardId).toBe('t1');
    expect(session.statusById).toEqual({ t1: 'needsWork' });
    expect(session.needsWorkCount).toBe(1);
    expect(session.correctCount).toBe(0);
  });

  it('next advances without scoring and previous does not undo that step', () => {
    const { getSession } = createSessionController();

    act(() => {
      getSession().goToNext();
    });

    let session = getSession();
    expect(session.currentIndex).toBe(1);
    expect(session.currentCard?.cardId).toBe('t2');
    expect(session.statusById).toEqual({});
    expect(session.canGoNext).toBe(true);
    expect(session.canGoPrevious).toBe(true);

    act(() => {
      getSession().goToPrevious();
    });

    session = getSession();
    expect(session.currentIndex).toBe(0);
    expect(session.statusById).toEqual({});
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

  it('filters official frequency annotations without scoring the same card twice', () => {
    const cards = [
      officialStudyCard({
        cardId: 'freq-a',
        cardNumber: 1,
        reference: 'John 11:35',
        verseText: 'Alpha walks.',
        annotations: [
          officialAnnotation({
            cardId: 'freq-a',
            annotationId: 'tier-2',
            type: 'frequency',
            start: 6,
            end: 11,
            frequencyTier: 2,
          }),
        ],
      }),
      officialStudyCard({
        cardId: 'plain',
        cardNumber: 2,
        reference: 'John 11:36',
        verseText: 'Beta speaks.',
      }),
    ];
    const { getSession } = createSessionController(cards, 'official');

    act(() => {
      getSession().markCorrect();
    });
    expect(getSession().correctCount).toBe(1);
    expect(getSession().currentCard?.cardId).toBe('plain');

    act(() => {
      getSession().toggleCategoryFilter('frequency2x');
    });

    const filtered = getSession();
    expect(filtered.settings.categoryFilters).toEqual(['frequency2x']);
    expect(filtered.totalCards).toBe(1);
    expect(filtered.currentCard?.cardId).toBe('freq-a');
    expect(filtered.correctCount).toBe(1);
    expect(filtered.statusById).toEqual({ 'freq-a': 'correct' });

    act(() => {
      getSession().clearCategoryFilters();
    });
    expect(getSession().totalCards).toBe(2);
    expect(getSession().correctCount).toBe(1);
    expect(getSession().cards.map((card) => card.cardId)).toEqual(['freq-a', 'plain']);
  });

  it('drops filters the new presentation does not offer instead of emptying the deck', () => {
    const cards = [
      officialStudyCard({
        cardId: 'tagged',
        cardNumber: 1,
        reference: 'John 11:35',
        verseText: 'Alpha walks.',
        tags: ['1x Keyword'],
      }),
      officialStudyCard({
        cardId: 'plain',
        cardNumber: 2,
        reference: 'John 11:36',
        verseText: 'Beta speaks.',
      }),
    ];
    const sessionRef: { current: UseFlashcardsResult | null } = { current: null };

    function Probe(): null {
      sessionRef.current = useFlashcards();
      return null;
    }

    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <FlashcardSessionProvider
          seasonId={TEST_SEASON_ID}
          title="Test Deck"
          cards={cards}
          scripturePresentation="legacy"
        >
          <Probe />
        </FlashcardSessionProvider>,
      );
    });

    act(() => {
      sessionRef.current?.toggleCategoryFilter('keyword1x');
    });
    expect(sessionRef.current?.totalCards).toBe(1);
    expect(sessionRef.current?.currentCard?.cardId).toBe('tagged');

    act(() => {
      renderer.update(
        <FlashcardSessionProvider
          seasonId={TEST_SEASON_ID}
          title="Test Deck"
          cards={cards}
          scripturePresentation="official"
        >
          <Probe />
        </FlashcardSessionProvider>,
      );
    });

    expect(sessionRef.current?.settings.categoryFilters).toEqual([]);
    expect(sessionRef.current?.totalCards).toBe(2);
    expect(sessionRef.current?.cards.map((card) => card.cardId)).toEqual(['tagged', 'plain']);
  });

  it('starts a new session when the study scope key changes', () => {
    const first = [
      officialStudyCard({
        cardId: 'section-a',
        cardNumber: 1,
        reference: 'John 11:35',
        verseText: 'Alpha walks.',
      }),
    ];
    const second = [
      officialStudyCard({
        cardId: 'section-b',
        cardNumber: 2,
        reference: 'John 11:36',
        verseText: 'Beta speaks.',
      }),
    ];
    const sessionRef: { current: UseFlashcardsResult | null } = { current: null };

    function Probe(): null {
      sessionRef.current = useFlashcards();
      return null;
    }

    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <FlashcardSessionProvider
          key="season:set:section-a"
          seasonId={TEST_SEASON_ID}
          title="Section A"
          cards={first}
          scripturePresentation="official"
        >
          <Probe />
        </FlashcardSessionProvider>,
      );
    });

    act(() => {
      sessionRef.current?.markCorrect();
    });
    expect(sessionRef.current?.correctCount).toBe(1);

    act(() => {
      renderer.update(
        <FlashcardSessionProvider
          key="season:set:section-b"
          seasonId={TEST_SEASON_ID}
          title="Section B"
          cards={second}
          scripturePresentation="official"
        >
          <Probe />
        </FlashcardSessionProvider>,
      );
    });

    expect(sessionRef.current?.correctCount).toBe(0);
    expect(sessionRef.current?.statusById).toEqual({});
    expect(sessionRef.current?.currentCard?.cardId).toBe('section-b');
    expect(sessionRef.current?.title).toBe('Section B');
  });
});
