import type { CardStatus, FlashcardDeck, Verse, VerseSegment } from '../types/verse';
import type { FlashcardSessionState } from './flashcardSessionReducer';

export interface FlashcardSessionView {
  deck: FlashcardDeck;
  verses: Verse[];
  currentVerse: Verse | undefined;
  currentIndex: number;
  currentCardNumber: number;
  totalCards: number;
  currentStatus: CardStatus;
  statusById: Record<string, CardStatus>;
  masteredCount: number;
  practicingCount: number;
  answeredCount: number;
  progress: number;
  isComplete: boolean;
  showCard: boolean;
}

export interface FlashcardSessionViewWithSegments extends FlashcardSessionView {
  currentSegments: VerseSegment[];
}

/** Count answered cards from status map only (unseen ids are absent). */
export function countAnsweredStatuses(statusById: Record<string, CardStatus>): {
  masteredCount: number;
  practicingCount: number;
} {
  let masteredCount = 0;
  let practicingCount = 0;

  for (const status of Object.values(statusById)) {
    if (status === 'mastered') {
      masteredCount += 1;
    } else if (status === 'practicing') {
      practicingCount += 1;
    }
  }

  return { masteredCount, practicingCount };
}

/** Pure projection of session state without verse parsing. */
export function deriveFlashcardSession(
  deck: FlashcardDeck,
  state: FlashcardSessionState,
): FlashcardSessionView {
  const verses = deck.verses;
  const totalCards = verses.length;
  const currentVerse = verses[state.currentIndex];
  const { masteredCount, practicingCount } = countAnsweredStatuses(state.statusById);
  const answeredCount = masteredCount + practicingCount;
  const isComplete = totalCards > 0 && answeredCount === totalCards;

  return {
    deck,
    verses,
    currentVerse,
    currentIndex: state.currentIndex,
    currentCardNumber: totalCards === 0 ? 0 : state.currentIndex + 1,
    totalCards,
    currentStatus:
      currentVerse === undefined ? 'unseen' : state.statusById[currentVerse.id] ?? 'unseen',
    statusById: state.statusById,
    masteredCount,
    practicingCount,
    answeredCount,
    progress: totalCards === 0 ? 0 : (state.currentIndex + 1) / totalCards,
    isComplete,
    showCard: !isComplete && currentVerse !== undefined,
  };
}
