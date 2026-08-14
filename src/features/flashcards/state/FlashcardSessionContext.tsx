import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import type { ReactNode } from 'react';

import type { Card } from '../domain/card';
import type { CardSide, CategoryFilterId, FlashcardSettings } from '../types/settings';
import { buildStudyVerses } from '../utils/buildStudyVerses';
import {
  flashcardSessionReducer,
  INITIAL_SESSION_STATE,
  type AnsweredStatus,
  type FlashcardSessionState,
} from './flashcardSessionReducer';
import {
  flashcardSettingsReducer,
  INITIAL_SETTINGS_STATE,
} from './flashcardSettingsReducer';

export type { AnsweredStatus, FlashcardSessionState };
export { flashcardSessionReducer, INITIAL_SESSION_STATE } from './flashcardSessionReducer';
export {
  flashcardSettingsReducer,
  INITIAL_SETTINGS_STATE,
} from './flashcardSettingsReducer';

export interface FlashcardSessionActions {
  markCorrect: () => void;
  markNeedsWork: () => void;
  goToNext: () => void;
  goToPrevious: () => void;
  goToIndex: (index: number) => void;
  resetSession: () => void;
  setShuffleCards: (value: boolean) => void;
  setDefaultSide: (value: CardSide) => void;
  toggleCategoryFilter: (filterId: CategoryFilterId) => void;
  clearCategoryFilters: () => void;
  restartFlashcards: () => void;
}

interface FlashcardSessionStateValue {
  seasonId: string;
  title: string;
  cards: readonly Card[];
  state: FlashcardSessionState;
  settings: FlashcardSettings;
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
  seasonId: string;
  title: string;
  cards: readonly Card[];
  children: ReactNode;
}

/**
 * Feature-local session store. Mount under the Study route so navigation chrome
 * and other tabs do not re-render on card answers.
 * Curriculum is injected by the route — this provider does not load data.
 */
export function FlashcardSessionProvider({
  seasonId,
  title,
  cards,
  children,
}: FlashcardSessionProviderProps): React.JSX.Element {
  const [state, dispatch] = useReducer(flashcardSessionReducer, INITIAL_SESSION_STATE);
  const [settings, dispatchSettings] = useReducer(
    flashcardSettingsReducer,
    INITIAL_SETTINGS_STATE,
  );

  const stateRef = useRef(state);
  stateRef.current = state;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const resolveActiveCards = useCallback(() => {
    const ids = stateRef.current.activeCardIds;
    if (ids === null) {
      return cardsRef.current;
    }
    const byId = new Map(cardsRef.current.map((card) => [card.cardId, card]));
    return ids.flatMap((id) => {
      const card = byId.get(id);
      return card === undefined ? [] : [card];
    });
  }, []);

  const answer = useCallback((status: AnsweredStatus) => {
    const activeCards = resolveActiveCards();
    const card = activeCards[stateRef.current.currentIndex];
    if (card === undefined) {
      return;
    }
    dispatch({
      type: 'answer',
      cardId: card.cardId,
      status,
      totalCards: activeCards.length,
    });
  }, [resolveActiveCards]);

  const applyStudyOrder = useCallback(
    (nextSettings: FlashcardSettings, resetProgress: boolean) => {
      const ordered = buildStudyVerses(cardsRef.current, nextSettings);
      dispatch({
        type: 'setActiveOrder',
        cardIds: ordered.map((card) => card.cardId),
        resetProgress,
      });
    },
    [],
  );

  const markCorrect = useCallback(() => answer('correct'), [answer]);
  const markNeedsWork = useCallback(() => answer('needsWork'), [answer]);

  const goToNext = useCallback(() => {
    dispatch({ type: 'next', totalCards: resolveActiveCards().length });
  }, [resolveActiveCards]);

  const goToPrevious = useCallback(() => dispatch({ type: 'previous' }), []);

  const goToIndex = useCallback(
    (index: number) => {
      dispatch({ type: 'goToIndex', index, totalCards: resolveActiveCards().length });
    },
    [resolveActiveCards],
  );

  const resetSession = useCallback(() => dispatch({ type: 'reset' }), []);

  const setShuffleCards = useCallback(
    (value: boolean) => {
      const next = { ...settingsRef.current, shuffleCards: value };
      dispatchSettings({ type: 'setShuffleCards', value });
      applyStudyOrder(next, false);
    },
    [applyStudyOrder],
  );

  const setDefaultSide = useCallback((value: CardSide) => {
    dispatchSettings({ type: 'setDefaultSide', value });
  }, []);

  const toggleCategoryFilter = useCallback(
    (filterId: CategoryFilterId) => {
      dispatchSettings({ type: 'toggleCategoryFilter', filterId });
      const current = settingsRef.current.categoryFilters;
      const categoryFilters = current.includes(filterId)
        ? current.filter((id) => id !== filterId)
        : [...current, filterId];
      applyStudyOrder({ ...settingsRef.current, categoryFilters }, false);
    },
    [applyStudyOrder],
  );

  const clearCategoryFilters = useCallback(() => {
    if (settingsRef.current.categoryFilters.length === 0) {
      return;
    }
    dispatchSettings({ type: 'clearCategoryFilters' });
    applyStudyOrder({ ...settingsRef.current, categoryFilters: [] }, false);
  }, [applyStudyOrder]);

  /** Clears progress and rebuilds order from current settings (Shuffle respected). */
  const restartFlashcards = useCallback(() => {
    applyStudyOrder(settingsRef.current, true);
  }, [applyStudyOrder]);

  const actions = useMemo<FlashcardSessionActions>(
    () => ({
      markCorrect,
      markNeedsWork,
      goToNext,
      goToPrevious,
      goToIndex,
      resetSession,
      setShuffleCards,
      setDefaultSide,
      toggleCategoryFilter,
      clearCategoryFilters,
      restartFlashcards,
    }),
    [
      markCorrect,
      markNeedsWork,
      goToNext,
      goToPrevious,
      goToIndex,
      resetSession,
      setShuffleCards,
      setDefaultSide,
      toggleCategoryFilter,
      clearCategoryFilters,
      restartFlashcards,
    ],
  );

  const stateValue = useMemo<FlashcardSessionStateValue>(
    () => ({ seasonId, title, cards, state, settings }),
    [seasonId, title, cards, state, settings],
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
