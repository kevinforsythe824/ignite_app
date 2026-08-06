import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import type { ReactNode } from 'react';

import { DEFAULT_DECK } from '../data/defaultDeck';
import type { FlashcardDeck } from '../types/verse';
import {
  flashcardSessionReducer,
  INITIAL_SESSION_STATE,
  type AnsweredStatus,
  type FlashcardSessionState,
} from './flashcardSessionReducer';

export type { AnsweredStatus, FlashcardSessionState };
export { flashcardSessionReducer, INITIAL_SESSION_STATE } from './flashcardSessionReducer';
export { DEFAULT_DECK } from '../data/defaultDeck';

export interface FlashcardSessionActions {
  markMastered: () => void;
  markPracticing: () => void;
  goToNext: () => void;
  goToPrevious: () => void;
  goToIndex: (index: number) => void;
  resetSession: () => void;
}

interface FlashcardSessionStateValue {
  deck: FlashcardDeck;
  state: FlashcardSessionState;
}

const FlashcardSessionStateContext = createContext<FlashcardSessionStateValue | undefined>(
  undefined,
);
const FlashcardSessionActionsContext = createContext<FlashcardSessionActions | undefined>(
  undefined,
);

/** @deprecated Prefer useFlashcardSessionState / useFlashcardSessionActions. */
export const FlashcardSessionContext = FlashcardSessionStateContext;

export interface FlashcardSessionProviderProps {
  /** Defaults to the bundled Luke 2 mock deck. */
  deck?: FlashcardDeck;
  children: ReactNode;
}

/**
 * Feature-local session store. Mount under the Study route so navigation chrome
 * and other tabs do not re-render on card answers.
 */
export function FlashcardSessionProvider({
  deck = DEFAULT_DECK,
  children,
}: FlashcardSessionProviderProps): React.JSX.Element {
  const [state, dispatch] = useReducer(flashcardSessionReducer, INITIAL_SESSION_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  const totalCards = deck.verses.length;
  const versesRef = useRef(deck.verses);
  versesRef.current = deck.verses;

  const answer = useCallback((status: AnsweredStatus) => {
    const verse = versesRef.current[stateRef.current.currentIndex];
    if (verse === undefined) {
      return;
    }
    dispatch({
      type: 'answer',
      verseId: verse.id,
      status,
      totalCards: versesRef.current.length,
    });
  }, []);

  const markMastered = useCallback(() => answer('mastered'), [answer]);
  const markPracticing = useCallback(() => answer('practicing'), [answer]);
  const goToNext = useCallback(
    () => dispatch({ type: 'next', totalCards }),
    [totalCards],
  );
  const goToPrevious = useCallback(() => dispatch({ type: 'previous' }), []);
  const goToIndex = useCallback(
    (index: number) => dispatch({ type: 'goToIndex', index, totalCards }),
    [totalCards],
  );
  const resetSession = useCallback(() => dispatch({ type: 'reset' }), []);

  const actions = useMemo<FlashcardSessionActions>(
    () => ({
      markMastered,
      markPracticing,
      goToNext,
      goToPrevious,
      goToIndex,
      resetSession,
    }),
    [markMastered, markPracticing, goToNext, goToPrevious, goToIndex, resetSession],
  );

  const stateValue = useMemo<FlashcardSessionStateValue>(
    () => ({ deck, state }),
    [deck, state],
  );

  return (
    <FlashcardSessionStateContext.Provider value={stateValue}>
      <FlashcardSessionActionsContext.Provider value={actions}>
        {children}
      </FlashcardSessionActionsContext.Provider>
    </FlashcardSessionStateContext.Provider>
  );
}

export function useFlashcardSessionState(): FlashcardSessionStateValue {
  const value = useContext(FlashcardSessionStateContext);
  if (value === undefined) {
    throw new Error('useFlashcardSessionState must be used within a FlashcardSessionProvider');
  }
  return value;
}

export function useFlashcardSessionActions(): FlashcardSessionActions {
  const value = useContext(FlashcardSessionActionsContext);
  if (value === undefined) {
    throw new Error('useFlashcardSessionActions must be used within a FlashcardSessionProvider');
  }
  return value;
}

export default FlashcardSessionStateContext;
