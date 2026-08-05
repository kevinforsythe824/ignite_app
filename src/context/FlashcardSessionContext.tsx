import React, { createContext, useCallback, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';

import mockVerseData from '../data/mock-verse-data.json';
import {
  DEFAULT_FLASHCARD_SETTINGS,
  type FlashcardSettings,
} from '../types/flashcards';
import type { CardStatus, FlashcardDeck, Verse } from '../types/verse';

export type AnsweredStatus = Exclude<CardStatus, 'unseen'>;

export const DEFAULT_DECK: FlashcardDeck = {
  deckId: 'luke-2',
  title: 'Luke 2:1-9',
  verses: mockVerseData as Verse[],
};

export interface FlashcardSessionState {
  currentIndex: number;
  statusById: Record<string, CardStatus>;
  settings: FlashcardSettings;
}

export interface FlashcardSessionValue extends FlashcardSessionState {
  deck: FlashcardDeck;
  markMastered: () => void;
  markPracticing: () => void;
  goToNext: () => void;
  goToPrevious: () => void;
  goToIndex: (index: number) => void;
  updateSettings: (patch: Partial<FlashcardSettings>) => void;
  resetSession: () => void;
}

type FlashcardSessionAction =
  | { type: 'answer'; verseId: string; status: AnsweredStatus; totalCards: number }
  | { type: 'next'; totalCards: number }
  | { type: 'previous' }
  | { type: 'goToIndex'; index: number; totalCards: number }
  | { type: 'updateSettings'; patch: Partial<FlashcardSettings> }
  | { type: 'reset' };

const INITIAL_STATE: FlashcardSessionState = {
  currentIndex: 0,
  statusById: {},
  settings: DEFAULT_FLASHCARD_SETTINGS,
};

function clampIndex(index: number, totalCards: number): number {
  if (totalCards <= 0) {
    return 0;
  }
  return Math.min(Math.max(index, 0), totalCards - 1);
}

function reducer(state: FlashcardSessionState, action: FlashcardSessionAction): FlashcardSessionState {
  switch (action.type) {
    case 'answer':
      return {
        ...state,
        currentIndex: clampIndex(state.currentIndex + 1, action.totalCards),
        statusById: { ...state.statusById, [action.verseId]: action.status },
      };
    case 'next':
      return { ...state, currentIndex: clampIndex(state.currentIndex + 1, action.totalCards) };
    case 'previous':
      return { ...state, currentIndex: Math.max(state.currentIndex - 1, 0) };
    case 'goToIndex':
      return { ...state, currentIndex: clampIndex(action.index, action.totalCards) };
    case 'updateSettings':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.patch,
        },
      };
    case 'reset':
      return {
        currentIndex: 0,
        statusById: {},
        settings: {
          ...DEFAULT_FLASHCARD_SETTINGS,
          indexLegendFilter: [...DEFAULT_FLASHCARD_SETTINGS.indexLegendFilter],
        },
      };
    default:
      return state;
  }
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
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
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
  const updateSettings = useCallback((patch: Partial<FlashcardSettings>) => {
    dispatch({ type: 'updateSettings', patch });
  }, []);
  const resetSession = useCallback(() => dispatch({ type: 'reset' }), []);

  const value = useMemo<FlashcardSessionValue>(
    () => ({
      deck,
      currentIndex: state.currentIndex,
      statusById: state.statusById,
      settings: state.settings,
      markMastered,
      markPracticing,
      goToNext,
      goToPrevious,
      goToIndex,
      updateSettings,
      resetSession,
    }),
    [
      deck,
      state.currentIndex,
      state.statusById,
      state.settings,
      markMastered,
      markPracticing,
      goToNext,
      goToPrevious,
      goToIndex,
      updateSettings,
      resetSession,
    ],
  );

  return <FlashcardSessionContext.Provider value={value}>{children}</FlashcardSessionContext.Provider>;
}

export default FlashcardSessionContext;
