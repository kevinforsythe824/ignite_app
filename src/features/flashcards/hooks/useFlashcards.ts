import { useEffect, useMemo, useState } from 'react';

import {
  useFlashcardSessionActions,
  useFlashcardSessionState,
  type FlashcardSessionActions,
} from '../state/FlashcardSessionContext';
import {
  deriveFlashcardSession,
  type FlashcardSessionViewWithSegments,
} from '../state/deriveFlashcardSession';
import { clearVerseSegmentCache, getVerseSegments } from '../utils/getVerseSegments';

export type UseFlashcardsResult = FlashcardSessionViewWithSegments &
  FlashcardSessionActions & {
    isSettingsOpen: boolean;
    openSettings: () => void;
    closeSettings: () => void;
  };

/**
 * Feature hook: derived session view + stable actions.
 * Verse parsing is cached by id and only recomputed when the current verse changes.
 */
export function useFlashcards(): UseFlashcardsResult {
  const { deck, state, settings } = useFlashcardSessionState();
  const actions = useFlashcardSessionActions();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    clearVerseSegmentCache();
  }, [deck.deckId]);

  const view = useMemo(
    () => deriveFlashcardSession(deck, state, settings),
    [deck, state, settings],
  );

  const currentSegments = useMemo(
    () => (view.currentVerse === undefined ? [] : getVerseSegments(view.currentVerse)),
    [view.currentVerse],
  );

  return useMemo(
    () => ({
      ...view,
      currentSegments,
      ...actions,
      isSettingsOpen,
      openSettings: () => setIsSettingsOpen(true),
      closeSettings: () => setIsSettingsOpen(false),
    }),
    [view, currentSegments, actions, isSettingsOpen],
  );
}

export default useFlashcards;
