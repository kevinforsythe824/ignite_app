import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Flashcard from '../components/flashcards/Flashcard';
import StudyHeader from '../components/flashcards/StudyHeader';
import { spacing } from '../constants/spacing';
import { colors, radius, shadows, typography } from '../constants/theme';
import useFlashcards from '../hooks/useFlashcards';

export const FlashcardStudyScreen: React.FC = () => {
  const {
    deck,
    currentVerse,
    currentCardNumber,
    totalCards,
    masteredCount,
    practicingCount,
    progress,
    isComplete,
    markMastered,
    markPracticing,
    resetSession,
  } = useFlashcards();

  const showCard = !isComplete && currentVerse !== undefined;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StudyHeader
        title={deck.title}
        current={currentCardNumber}
        total={totalCards}
        masteredCount={masteredCount}
        practicingCount={practicingCount}
        progress={progress}
      />

      {showCard ? (
        <View style={styles.cardSection}>
          <View style={styles.cardArea}>
            <Flashcard
              verse={currentVerse}
              onSwipeMastered={markMastered}
              onSwipePracticing={markPracticing}
            />
          </View>
          <Text style={styles.hint}>Tap to flip</Text>
        </View>
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

interface SessionCompleteProps {
  masteredCount: number;
  practicingCount: number;
  totalCards: number;
  onRestart: () => void;
}

const SessionComplete: React.FC<SessionCompleteProps> = ({
  masteredCount,
  practicingCount,
  totalCards,
  onRestart,
}) => (
  <View style={styles.completeSection}>
    <Ionicons name="trophy-outline" size={56} color={colors.accentRed} />
    <Text style={styles.completeTitle}>Deck complete</Text>
    <Text style={styles.completeSummary}>
      {`${masteredCount} mastered · ${practicingCount} to practice · ${totalCards} cards`}
    </Text>
    <Pressable
      onPress={onRestart}
      accessibilityRole="button"
      style={({ pressed }) => [styles.restartButton, pressed && styles.restartButtonPressed]}
    >
      <Text style={styles.restartLabel}>Study again</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  cardSection: {
    flex: 1,
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  cardArea: {
    flex: 1,
  },
  hint: {
    ...typography.hint,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  completeSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPaddingH,
    gap: spacing.md,
  },
  completeTitle: {
    ...typography.verseReference,
  },
  completeSummary: {
    ...typography.hint,
    textAlign: 'center',
  },
  restartButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.cardWhite,
    ...shadows.card,
  },
  restartButtonPressed: {
    opacity: 0.7,
  },
  restartLabel: {
    ...typography.title,
  },
});

export default FlashcardStudyScreen;
