import { useMemo } from 'react';

import {
  useFlashcardSessionActions,
  useFlashcardSessionState,
  type FlashcardSessionActions,
} from '../state/FlashcardSessionContext';
import {
  deriveFlashcardSession,
  type FlashcardSessionView,
} from '../state/deriveFlashcardSession';

export type UseFlashcardsResult = FlashcardSessionView & FlashcardSessionActions;

/**
 * Feature hook: derived session view + stable action callbacks.
 * Parsing and counts live in deriveFlashcardSession (pure).
 */
export function useFlashcards(): UseFlashcardsResult {
  const { deck, state } = useFlashcardSessionState();
  const actions = useFlashcardSessionActions();

  const view = useMemo(() => deriveFlashcardSession(deck, state), [deck, state]);

  return useMemo(
    () => ({
      ...view,
      ...actions,
    }),
    [view, actions],
  );
}

export default useFlashcards;
