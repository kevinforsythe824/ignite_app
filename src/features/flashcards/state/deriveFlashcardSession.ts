import type { FlashcardSettings } from '../types/settings';
import type { CardStatus, FlashcardDeck, Verse, VerseSegment } from '../types/verse';
import { resolveVersesByIds } from '../utils/buildStudyVerses';
import type { FlashcardSessionState } from './flashcardSessionReducer';

export interface FlashcardSessionView {
  deck: FlashcardDeck;
  /** Active study list after filters / shuffle. */
  verses: Verse[];
  currentVerse: Verse | undefined;
  currentIndex: number;
  currentCardNumber: number;
  totalCards: number;
  currentStatus: CardStatus;
  statusById: Record<string, CardStatus>;
  correctCount: number;
  needsWorkCount: number;
  answeredCount: number;
  progress: number;
  isComplete: boolean;
  showCard: boolean;
  settings: FlashcardSettings;
}

export interface FlashcardSessionViewWithSegments extends FlashcardSessionView {
  currentSegments: VerseSegment[];
}

/** Count answered cards from status map only (unseen ids are absent). */
export function countAnsweredStatuses(statusById: Record<string, CardStatus>): {
  correctCount: number;
  needsWorkCount: number;
} {
  let correctCount = 0;
  let needsWorkCount = 0;

  for (const status of Object.values(statusById)) {
    if (status === 'correct') {
      correctCount += 1;
    } else if (status === 'needsWork') {
      needsWorkCount += 1;
    }
  }

  return { correctCount, needsWorkCount };
}

/**
 * Counts session grades only for verses in the active study list so filtered
 * decks do not credit answers from cards that are currently hidden.
 */
export function countActiveAnsweredStatuses(
  statusById: Record<string, CardStatus>,
  activeVerseIds: readonly string[],
): { correctCount: number; needsWorkCount: number; answeredCount: number } {
  let correctCount = 0;
  let needsWorkCount = 0;

  for (const id of activeVerseIds) {
    const status = statusById[id];
    if (status === 'correct') {
      correctCount += 1;
    } else if (status === 'needsWork') {
      needsWorkCount += 1;
    }
  }

  return {
    correctCount,
    needsWorkCount,
    answeredCount: correctCount + needsWorkCount,
  };
}

/** Resolves the active study verses from session order or deck order. */
export function resolveStudyVerses(
  deck: FlashcardDeck,
  state: FlashcardSessionState,
): Verse[] {
  if (state.activeVerseIds === null) {
    return deck.verses;
  }
  return resolveVersesByIds(deck.verses, state.activeVerseIds);
}

/** Pure projection of session state without verse parsing. */
export function deriveFlashcardSession(
  deck: FlashcardDeck,
  state: FlashcardSessionState,
  settings: FlashcardSettings,
): FlashcardSessionView {
  const verses = resolveStudyVerses(deck, state);
  const totalCards = verses.length;
  /** `undefined` when index is past the last card (session finished). */
  const currentVerse =
    state.currentIndex >= totalCards ? undefined : verses[state.currentIndex];
  const activeIds = verses.map((verse) => verse.id);
  const { correctCount, needsWorkCount, answeredCount } = countActiveAnsweredStatuses(
    state.statusById,
    activeIds,
  );
  // Prefer answered-count so filtered decks complete correctly; index-past-end
  // covers the post-answer transition off the last card (no invisible leftover).
  const isComplete =
    totalCards > 0 &&
    (answeredCount === totalCards || state.currentIndex >= totalCards);

  return {
    deck,
    verses,
    currentVerse,
    currentIndex: state.currentIndex,
    currentCardNumber:
      totalCards === 0 ? 0 : Math.min(state.currentIndex + 1, totalCards),
    totalCards,
    currentStatus:
      currentVerse === undefined ? 'unseen' : state.statusById[currentVerse.id] ?? 'unseen',
    statusById: state.statusById,
    correctCount,
    needsWorkCount,
    answeredCount,
    progress: totalCards === 0 ? 0 : isComplete ? 1 : (state.currentIndex + 1) / totalCards,
    isComplete,
    showCard: !isComplete && currentVerse !== undefined,
    settings,
  };
}
