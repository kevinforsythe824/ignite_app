import { useEffect, useMemo } from 'react';

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

export type UseFlashcardsResult = FlashcardSessionViewWithSegments & FlashcardSessionActions;

/**
 * Feature hook: derived session view + stable actions.
 * Verse parsing is cached by id and only recomputed when the current verse changes.
 */
export function useFlashcards(): UseFlashcardsResult {
  const { deck, state } = useFlashcardSessionState();
  const actions = useFlashcardSessionActions();

  useEffect(() => {
    clearVerseSegmentCache();
  }, [deck.deckId]);

  const view = useMemo(() => deriveFlashcardSession(deck, state), [deck, state]);

  const currentSegments = useMemo(
    () => (view.currentVerse === undefined ? [] : getVerseSegments(view.currentVerse)),
    [view.currentVerse],
  );

  return useMemo(
    () => ({
      ...view,
      currentSegments,
      ...actions,
    }),
    [view, currentSegments, actions],
  );
}

export default useFlashcards;
