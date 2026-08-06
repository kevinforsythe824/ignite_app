import type { CardStatus, FlashcardDeck, Verse, VerseSegment } from '../types/verse';
import { parseVerseToSegments } from '../utils/parseVerseToSegments';
import type { FlashcardSessionState } from './flashcardSessionReducer';

export interface FlashcardSessionView {
  deck: FlashcardDeck;
  verses: Verse[];
  currentVerse: Verse | undefined;
  currentSegments: VerseSegment[];
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

/** Pure projection of session state — single place for derived flashcard fields. */
export function deriveFlashcardSession(
  deck: FlashcardDeck,
  state: FlashcardSessionState,
): FlashcardSessionView {
  const verses = deck.verses;
  const totalCards = verses.length;
  const currentVerse = verses[state.currentIndex];

  let masteredCount = 0;
  let practicingCount = 0;

  for (const verse of verses) {
    const status = state.statusById[verse.id];
    if (status === 'mastered') {
      masteredCount += 1;
    } else if (status === 'practicing') {
      practicingCount += 1;
    }
  }

  const answeredCount = masteredCount + practicingCount;
  const isComplete = totalCards > 0 && answeredCount === totalCards;

  return {
    deck,
    verses,
    currentVerse,
    currentSegments: currentVerse === undefined ? [] : parseVerseToSegments(currentVerse),
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
