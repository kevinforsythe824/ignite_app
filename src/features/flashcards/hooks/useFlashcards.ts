import { useEffect, useMemo, useState } from 'react';

import type { ScripturePresentationMode } from '../scripturePresentation';
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
    scripturePresentation: ScripturePresentationMode;
    isSettingsOpen: boolean;
    openSettings: () => void;
    closeSettings: () => void;
  };

/**
 * Feature hook: derived session view + stable actions.
 * Legacy verse parsing is cached by season+materialSet+card and only
 * recomputed when the current legacy card changes. Official cards skip it.
 */
export function useFlashcards(): UseFlashcardsResult {
  const { seasonId, title, cards, state, settings, scripturePresentation } =
    useFlashcardSessionState();
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

  // Trusted session mode wins when a card has both matchedRules and annotations.
  // Official: verseText + annotations → OfficialScriptureText, and this hook
  // does not call getVerseSegments or fill the legacy segment cache.
  // Legacy: matchedRules → getVerseSegments → RichVerseText.
  // A future scripture list should render Card.reference, Card.verseText, and
  // Card.annotations through OfficialScriptureText from the same Card. Do not
  // route that list through this session hook.
  const currentSegments = useMemo(() => {
    if (scripturePresentation !== 'legacy' || view.currentCard === undefined) {
      return [];
    }
    return getVerseSegments(view.currentCard);
  }, [scripturePresentation, view.currentCard]);

  return useMemo(
    () => ({
      ...view,
      currentSegments,
      scripturePresentation,
      ...actions,
      isSettingsOpen,
      openSettings: () => setIsSettingsOpen(true),
      closeSettings: () => setIsSettingsOpen(false),
    }),
    [view, currentSegments, scripturePresentation, actions, isSettingsOpen],
  );
}

export default useFlashcards;
