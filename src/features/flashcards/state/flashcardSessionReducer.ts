import type { CardStatus } from '../types/verse';

export type AnsweredStatus = Exclude<CardStatus, 'unseen'>;

export interface FlashcardSessionState {
  currentIndex: number;
  statusById: Record<string, CardStatus>;
}

export type FlashcardSessionAction =
  | { type: 'answer'; verseId: string; status: AnsweredStatus; totalCards: number }
  | { type: 'next'; totalCards: number }
  | { type: 'previous' }
  | { type: 'goToIndex'; index: number; totalCards: number }
  | { type: 'reset' };

export const INITIAL_SESSION_STATE: FlashcardSessionState = {
  currentIndex: 0,
  statusById: {},
};

export function clampIndex(index: number, totalCards: number): number {
  if (totalCards <= 0) {
    return 0;
  }
  return Math.min(Math.max(index, 0), totalCards - 1);
}

/** Pure session state transitions for a flashcard study session. */
export function flashcardSessionReducer(
  state: FlashcardSessionState,
  action: FlashcardSessionAction,
): FlashcardSessionState {
  switch (action.type) {
    case 'answer':
      return {
        currentIndex: clampIndex(state.currentIndex + 1, action.totalCards),
        statusById: { ...state.statusById, [action.verseId]: action.status },
      };
    case 'next':
      return { ...state, currentIndex: clampIndex(state.currentIndex + 1, action.totalCards) };
    case 'previous':
      return { ...state, currentIndex: Math.max(state.currentIndex - 1, 0) };
    case 'goToIndex':
      return { ...state, currentIndex: clampIndex(action.index, action.totalCards) };
    case 'reset':
      return INITIAL_SESSION_STATE;
    default:
      return state;
  }
}
