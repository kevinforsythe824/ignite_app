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
import type { CardSide, CategoryFilterId, FlashcardSettings } from '../types/settings';
import type { FlashcardDeck } from '../types/verse';
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
export { DEFAULT_DECK } from '../data/defaultDeck';

export interface FlashcardSessionActions {
  markMastered: () => void;
  markPracticing: () => void;
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
  deck: FlashcardDeck;
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
  const [settings, dispatchSettings] = useReducer(
    flashcardSettingsReducer,
    INITIAL_SETTINGS_STATE,
  );

  const stateRef = useRef(state);
  stateRef.current = state;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const versesRef = useRef(deck.verses);
  versesRef.current = deck.verses;

  const resolveActiveVerses = useCallback(() => {
    const ids = stateRef.current.activeVerseIds;
    if (ids === null) {
      return versesRef.current;
    }
    const byId = new Map(versesRef.current.map((verse) => [verse.id, verse]));
    return ids.flatMap((id) => {
      const verse = byId.get(id);
      return verse === undefined ? [] : [verse];
    });
  }, []);

  const answer = useCallback((status: AnsweredStatus) => {
    const activeVerses = resolveActiveVerses();
    const verse = activeVerses[stateRef.current.currentIndex];
    if (verse === undefined) {
      return;
    }
    dispatch({
      type: 'answer',
      verseId: verse.id,
      status,
      totalCards: activeVerses.length,
    });
  }, [resolveActiveVerses]);

  const applyStudyOrder = useCallback(
    (nextSettings: FlashcardSettings, resetProgress: boolean) => {
      const ordered = buildStudyVerses(versesRef.current, nextSettings);
      dispatch({
        type: 'setActiveOrder',
        verseIds: ordered.map((verse) => verse.id),
        resetProgress,
      });
    },
    [],
  );

  const markMastered = useCallback(() => answer('mastered'), [answer]);
  const markPracticing = useCallback(() => answer('practicing'), [answer]);

  const goToNext = useCallback(() => {
    dispatch({ type: 'next', totalCards: resolveActiveVerses().length });
  }, [resolveActiveVerses]);

  const goToPrevious = useCallback(() => dispatch({ type: 'previous' }), []);

  const goToIndex = useCallback(
    (index: number) => {
      dispatch({ type: 'goToIndex', index, totalCards: resolveActiveVerses().length });
    },
    [resolveActiveVerses],
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
      markMastered,
      markPracticing,
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
      markMastered,
      markPracticing,
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
    () => ({ deck, state, settings }),
    [deck, state, settings],
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
