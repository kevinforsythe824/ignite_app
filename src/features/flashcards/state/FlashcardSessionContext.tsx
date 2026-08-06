import React, { createContext, useCallback, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';

import mockVerseData from '../../../data/mock-verse-data.json';
import type { FlashcardDeck, Verse } from '../types/verse';
import {
  flashcardSessionReducer,
  INITIAL_SESSION_STATE,
  type AnsweredStatus,
  type FlashcardSessionState,
} from './flashcardSessionReducer';

export type { AnsweredStatus, FlashcardSessionState };
export { flashcardSessionReducer, INITIAL_SESSION_STATE } from './flashcardSessionReducer';

export const DEFAULT_DECK: FlashcardDeck = {
  deckId: 'luke-2',
  title: 'Luke 2:1-9',
  verses: mockVerseData as Verse[],
};

export interface FlashcardSessionValue extends FlashcardSessionState {
  deck: FlashcardDeck;
  markMastered: () => void;
  markPracticing: () => void;
  goToNext: () => void;
  goToPrevious: () => void;
  goToIndex: (index: number) => void;
  resetSession: () => void;
}

export const FlashcardSessionContext = createContext<FlashcardSessionValue | undefined>(undefined);

export interface FlashcardSessionProviderProps {
  /** Defaults to the bundled Luke 2 mock deck. */
  deck?: FlashcardDeck;
  children: ReactNode;
}

export function FlashcardSessionProvider({
  deck = DEFAULT_DECK,
  children,
}: FlashcardSessionProviderProps): React.JSX.Element {
  const [state, dispatch] = useReducer(flashcardSessionReducer, INITIAL_SESSION_STATE);
  const totalCards = deck.verses.length;

  const answer = useCallback(
    (status: AnsweredStatus) => {
      const verse = deck.verses[state.currentIndex];
      if (verse === undefined) {
        return;
      }
      dispatch({ type: 'answer', verseId: verse.id, status, totalCards });
    },
    [deck.verses, state.currentIndex, totalCards],
  );

  const markMastered = useCallback(() => answer('mastered'), [answer]);
  const markPracticing = useCallback(() => answer('practicing'), [answer]);
  const goToNext = useCallback(() => dispatch({ type: 'next', totalCards }), [totalCards]);
  const goToPrevious = useCallback(() => dispatch({ type: 'previous' }), []);
  const goToIndex = useCallback(
    (index: number) => dispatch({ type: 'goToIndex', index, totalCards }),
    [totalCards],
  );
  const resetSession = useCallback(() => dispatch({ type: 'reset' }), []);

  const value = useMemo<FlashcardSessionValue>(
    () => ({
      deck,
      currentIndex: state.currentIndex,
      statusById: state.statusById,
      markMastered,
      markPracticing,
      goToNext,
      goToPrevious,
      goToIndex,
      resetSession,
    }),
    [
      deck,
      state.currentIndex,
      state.statusById,
      markMastered,
      markPracticing,
      goToNext,
      goToPrevious,
      goToIndex,
      resetSession,
    ],
  );

  return <FlashcardSessionContext.Provider value={value}>{children}</FlashcardSessionContext.Provider>;
}

export default FlashcardSessionContext;
