import type { Card } from '../domain/card';
import type { StudyCurriculum } from '../repositories/curriculumRepository';
import type { FlashcardSettings } from '../types/settings';
import type { CardStatus, VerseSegment } from '../types/verse';
import { resolveVersesByIds } from '../utils/buildStudyVerses';
import type { FlashcardSessionState } from './flashcardSessionReducer';

export interface FlashcardSessionView {
  seasonId: string;
  title: string;
  /** Active study list after filters / shuffle. */
  cards: Card[];
  currentCard: Card | undefined;
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
 * Counts session grades only for cards in the active study list so filtered
 * decks do not credit answers from cards that are currently hidden.
 */
export function countActiveAnsweredStatuses(
  statusById: Record<string, CardStatus>,
  activeCardIds: readonly string[],
): { correctCount: number; needsWorkCount: number; answeredCount: number } {
  let correctCount = 0;
  let needsWorkCount = 0;

  for (const id of activeCardIds) {
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

/** Resolves the active study cards from session order or curriculum order. */
export function resolveStudyVerses(
  cards: readonly Card[],
  state: FlashcardSessionState,
): Card[] {
  if (state.activeCardIds === null) {
    return [...cards];
  }
  return resolveVersesByIds(cards, state.activeCardIds);
}

/** Pure projection of session state without verse parsing. */
export function deriveFlashcardSession(
  curriculum: Pick<StudyCurriculum, 'seasonId' | 'title' | 'cards'>,
  state: FlashcardSessionState,
  settings: FlashcardSettings,
): FlashcardSessionView {
  const cards = resolveStudyVerses(curriculum.cards, state);
  const totalCards = cards.length;
  /** `undefined` when index is past the last card (session finished). */
  const currentCard =
    state.currentIndex >= totalCards ? undefined : cards[state.currentIndex];
  const activeIds = cards.map((card) => card.cardId);
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
    seasonId: curriculum.seasonId,
    title: curriculum.title,
    cards,
    currentCard,
    currentIndex: state.currentIndex,
    currentCardNumber:
      totalCards === 0 ? 0 : Math.min(state.currentIndex + 1, totalCards),
    totalCards,
    currentStatus:
      currentCard === undefined ? 'unseen' : state.statusById[currentCard.cardId] ?? 'unseen',
    statusById: state.statusById,
    correctCount,
    needsWorkCount,
    answeredCount,
    progress: totalCards === 0 ? 0 : isComplete ? 1 : (state.currentIndex + 1) / totalCards,
    isComplete,
    showCard: !isComplete && currentCard !== undefined,
    settings,
  };
}
