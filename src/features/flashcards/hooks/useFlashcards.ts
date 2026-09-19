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
 * Verse parsing is cached by season+materialSet+card and only recomputed
 * when the current card changes.
 */
export function useFlashcards(): UseFlashcardsResult {
  const { seasonId, title, cards, state, settings } = useFlashcardSessionState();
  const actions = useFlashcardSessionActions();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const materialSetId = cards[0]?.materialSetId;

  useEffect(() => {
    clearVerseSegmentCache();
  }, [seasonId, materialSetId]);

  const view = useMemo(
    () => deriveFlashcardSession({ seasonId, title, cards }, state, settings),
    [seasonId, title, cards, state, settings],
  );

  const currentSegments = useMemo(
    () => (view.currentCard === undefined ? [] : getVerseSegments(view.currentCard)),
    [view.currentCard],
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
