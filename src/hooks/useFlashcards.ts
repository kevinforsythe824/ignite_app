import { useContext, useMemo } from 'react';

import { FlashcardSessionContext } from '../context/FlashcardSessionContext';
import type { FlashcardSettings } from '../types/flashcards';
import type { CardStatus, FlashcardDeck, Verse } from '../types/verse';

export interface UseFlashcardsResult {
  deck: FlashcardDeck;
  verses: Verse[];
  /** `undefined` only when the deck is empty — consumers should guard. */
  currentVerse: Verse | undefined;
  currentIndex: number;
  /** 1-based position for the "3/9" counter. */
  currentCardNumber: number;
  totalCards: number;
  currentStatus: CardStatus;
  statusById: Record<string, CardStatus>;
  settings: FlashcardSettings;
  masteredCount: number;
  practicingCount: number;
  answeredCount: number;
  /** Deck position as 0–1, matching the header counter. */
  progress: number;
  isComplete: boolean;
  markMastered: () => void;
  markPracticing: () => void;
  goToNext: () => void;
  goToPrevious: () => void;
  goToIndex: (index: number) => void;
  updateSettings: (patch: Partial<FlashcardSettings>) => void;
  resetSession: () => void;
}

export function useFlashcards(): UseFlashcardsResult {
  const session = useContext(FlashcardSessionContext);

  if (session === undefined) {
    throw new Error('useFlashcards must be used within a FlashcardSessionProvider');
  }

  const { deck, currentIndex, statusById, settings } = session;
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

  return {
    deck,
    verses,
    currentVerse,
    currentIndex,
    currentCardNumber: totalCards === 0 ? 0 : currentIndex + 1,
    totalCards,
    currentStatus: currentVerse === undefined ? 'unseen' : statusById[currentVerse.id] ?? 'unseen',
    statusById,
    settings,
    masteredCount: counts.mastered,
    practicingCount: counts.practicing,
    answeredCount,
    progress: totalCards === 0 ? 0 : (currentIndex + 1) / totalCards,
    isComplete: totalCards > 0 && answeredCount === totalCards,
    markMastered: session.markMastered,
    markPracticing: session.markPracticing,
    goToNext: session.goToNext,
    goToPrevious: session.goToPrevious,
    goToIndex: session.goToIndex,
    updateSettings: session.updateSettings,
    resetSession: session.resetSession,
  };
}

export default useFlashcards;
