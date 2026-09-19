import type { CardStatus } from '../types/verse';

export type AnsweredStatus = Exclude<CardStatus, 'unseen'>;

/**
 * Session maps stay cardId-keyed.
 * Safe only because a live session always loads exactly one (seasonId, materialSetId).
 * Cross-MaterialSet identity uses makeCardKey(seasonId, materialSetId, cardId).
 * Do not redesign flip/swipe/navigation to composite keys while that invariant holds.
 */
export interface FlashcardSessionState {
  currentIndex: number;
  /**
   * Grades keyed by cardId within the loaded MaterialSet — not makeCardKey.
   * A session never mixes MaterialSets (curriculum load enforces one set).
   */
  statusById: Record<string, CardStatus>;
  /**
   * Active study order (card ids). When null, callers use curriculum order.
   * Set when filters/shuffle rebuild the list; preserved across progress reset.
   * cardId-scoped within the session's single MaterialSet.
   */
  activeCardIds: string[] | null;
}

export type FlashcardSessionAction =
  | { type: 'answer'; cardId: string; status: AnsweredStatus; totalCards: number }
  | { type: 'next'; totalCards: number }
  | { type: 'previous' }
  | { type: 'goToIndex'; index: number; totalCards: number }
  | { type: 'setActiveOrder'; cardIds: string[]; resetProgress?: boolean }
  | { type: 'reset' };

export const INITIAL_SESSION_STATE: FlashcardSessionState = {
  currentIndex: 0,
  statusById: {},
  activeCardIds: null,
};

export function clampIndex(index: number, totalCards: number): number {
  if (totalCards <= 0) {
    return 0;
  }
  return Math.min(Math.max(index, 0), totalCards - 1);
}

/**
 * After answering, allow `currentIndex === totalCards` (one past the last card)
 * so the session can leave the active-card UI. Navigation (`next` / `goToIndex`)
 * still clamps to a valid card index via `clampIndex`.
 */
export function advanceIndexAfterAnswer(currentIndex: number, totalCards: number): number {
  if (totalCards <= 0) {
    return 0;
  }
  return Math.min(currentIndex + 1, totalCards);
}

/** Pure session state transitions for a flashcard study session. */
export function flashcardSessionReducer(
  state: FlashcardSessionState,
  action: FlashcardSessionAction,
): FlashcardSessionState {
  switch (action.type) {
    case 'answer':
      return {
        ...state,
        currentIndex: advanceIndexAfterAnswer(state.currentIndex, action.totalCards),
        statusById: { ...state.statusById, [action.cardId]: action.status },
      };
    case 'next':
      return { ...state, currentIndex: clampIndex(state.currentIndex + 1, action.totalCards) };
    case 'previous':
      return { ...state, currentIndex: Math.max(state.currentIndex - 1, 0) };
    case 'goToIndex':
      return { ...state, currentIndex: clampIndex(action.index, action.totalCards) };
    case 'setActiveOrder': {
      const totalCards = action.cardIds.length;
      if (action.resetProgress === true) {
        return {
          currentIndex: 0,
          statusById: {},
          activeCardIds: action.cardIds,
        };
      }
      return {
        ...state,
        activeCardIds: action.cardIds,
        currentIndex: clampIndex(state.currentIndex, totalCards),
      };
    }
    case 'reset':
      return {
        ...INITIAL_SESSION_STATE,
        activeCardIds: state.activeCardIds,
      };
    default:
      return state;
  }
}
