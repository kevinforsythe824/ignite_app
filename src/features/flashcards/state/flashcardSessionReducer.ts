import type { CardStatus } from '../types/verse';

export type AnsweredStatus = Exclude<CardStatus, 'unseen'>;

export interface FlashcardSessionState {
  currentIndex: number;
  statusById: Record<string, CardStatus>;
  /**
   * Active study order (verse ids). When null, callers use deck order.
   * Set when filters/shuffle rebuild the list; preserved across progress reset.
   */
  activeVerseIds: string[] | null;
}

export type FlashcardSessionAction =
  | { type: 'answer'; verseId: string; status: AnsweredStatus; totalCards: number }
  | { type: 'next'; totalCards: number }
  | { type: 'previous' }
  | { type: 'goToIndex'; index: number; totalCards: number }
  | { type: 'setActiveOrder'; verseIds: string[]; resetProgress?: boolean }
  | { type: 'reset' };

export const INITIAL_SESSION_STATE: FlashcardSessionState = {
  currentIndex: 0,
  statusById: {},
  activeVerseIds: null,
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
        statusById: { ...state.statusById, [action.verseId]: action.status },
      };
    case 'next':
      return { ...state, currentIndex: clampIndex(state.currentIndex + 1, action.totalCards) };
    case 'previous':
      return { ...state, currentIndex: Math.max(state.currentIndex - 1, 0) };
    case 'goToIndex':
      return { ...state, currentIndex: clampIndex(action.index, action.totalCards) };
    case 'setActiveOrder': {
      const totalCards = action.verseIds.length;
      if (action.resetProgress === true) {
        return {
          currentIndex: 0,
          statusById: {},
          activeVerseIds: action.verseIds,
        };
      }
      return {
        ...state,
        activeVerseIds: action.verseIds,
        currentIndex: clampIndex(state.currentIndex, totalCards),
      };
    }
    case 'reset':
      return {
        ...INITIAL_SESSION_STATE,
        activeVerseIds: state.activeVerseIds,
      };
    default:
      return state;
  }
}
