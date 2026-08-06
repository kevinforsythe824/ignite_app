import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FlashcardStudyActive from '../features/flashcards/components/FlashcardStudyActive';
import SessionComplete from '../features/flashcards/components/SessionComplete';
import StudyHeader from '../features/flashcards/components/StudyHeader';
import useFlashcards from '../features/flashcards/hooks/useFlashcards';
import { colors } from '../shared/theme';

/** Thin study screen: hooks + feature components only. */
export const FlashcardStudyScreen: React.FC = () => {
  const {
    deck,
    currentVerse,
    currentSegments,
    currentCardNumber,
    totalCards,
    masteredCount,
    practicingCount,
    progress,
    showCard,
    markMastered,
    markPracticing,
    resetSession,
  } = useFlashcards();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StudyHeader
        title={deck.title}
        current={currentCardNumber}
        total={totalCards}
        masteredCount={masteredCount}
        practicingCount={practicingCount}
        progress={progress}
      />

      {showCard && currentVerse !== undefined ? (
        <FlashcardStudyActive
          verse={currentVerse}
          segments={currentSegments}
          onSwipeMastered={markMastered}
          onSwipePracticing={markPracticing}
        />
      ) : (
        <SessionComplete
          masteredCount={masteredCount}
          practicingCount={practicingCount}
          totalCards={totalCards}
          onRestart={resetSession}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default FlashcardStudyScreen;
