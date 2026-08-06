import { useContext, useMemo } from 'react';

import { FlashcardSessionContext } from '../state/FlashcardSessionContext';
import type { CardStatus, FlashcardDeck, Verse, VerseSegment } from '../types/verse';
import { parseVerseToSegments } from '../utils/parseVerseToSegments';

export interface UseFlashcardsResult {
  deck: FlashcardDeck;
  verses: Verse[];
  /** `undefined` only when the deck is empty — consumers should guard. */
  currentVerse: Verse | undefined;
  /** Parsed quote-side segments for `currentVerse`; empty when none. */
  currentSegments: VerseSegment[];
  currentIndex: number;
  /** 1-based position for the "3/9" counter. */
  currentCardNumber: number;
  totalCards: number;
  currentStatus: CardStatus;
  statusById: Record<string, CardStatus>;
  masteredCount: number;
  practicingCount: number;
  answeredCount: number;
  /** Deck position as 0–1, matching the header counter. */
  progress: number;
  isComplete: boolean;
  /** True when there is an unanswered card to show. */
  showCard: boolean;
  markMastered: () => void;
  markPracticing: () => void;
  goToNext: () => void;
  goToPrevious: () => void;
  goToIndex: (index: number) => void;
  resetSession: () => void;
}

export function useFlashcards(): UseFlashcardsResult {
  const session = useContext(FlashcardSessionContext);

  if (session === undefined) {
    throw new Error('useFlashcards must be used within a FlashcardSessionProvider');
  }

  const { deck, currentIndex, statusById } = session;
  const verses = deck.verses;

  const counts = useMemo(() => {
    let mastered = 0;
    let practicing = 0;

    for (const verse of verses) {
      const status = statusById[verse.id];
      if (status === 'mastered') {
        mastered += 1;
      } else if (status === 'practicing') {
        practicing += 1;
      }
    }

    return { mastered, practicing };
  }, [verses, statusById]);

  const totalCards = verses.length;
  const currentVerse = verses[currentIndex];
  const answeredCount = counts.mastered + counts.practicing;
  const isComplete = totalCards > 0 && answeredCount === totalCards;
  const showCard = !isComplete && currentVerse !== undefined;

  const currentSegments = useMemo(
    () => (currentVerse === undefined ? [] : parseVerseToSegments(currentVerse)),
    [currentVerse],
  );

  return {
    deck,
    verses,
    currentVerse,
    currentSegments,
    currentIndex,
    currentCardNumber: totalCards === 0 ? 0 : currentIndex + 1,
    totalCards,
    currentStatus: currentVerse === undefined ? 'unseen' : statusById[currentVerse.id] ?? 'unseen',
    statusById,
    masteredCount: counts.mastered,
    practicingCount: counts.practicing,
    answeredCount,
    progress: totalCards === 0 ? 0 : (currentIndex + 1) / totalCards,
    isComplete,
    showCard,
    markMastered: session.markMastered,
    markPracticing: session.markPracticing,
    goToNext: session.goToNext,
    goToPrevious: session.goToPrevious,
    goToIndex: session.goToIndex,
    resetSession: session.resetSession,
  };
}

export default useFlashcards;
