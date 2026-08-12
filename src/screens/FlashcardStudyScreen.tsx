import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FlashcardSettingsPanel from '../features/flashcards/components/FlashcardSettingsPanel';
import FlashcardStudyActive from '../features/flashcards/components/FlashcardStudyActive';
import SessionComplete from '../features/flashcards/components/SessionComplete';
import SettingsBottomSheet from '../features/flashcards/components/SettingsBottomSheet';
import StudyHeader from '../features/flashcards/components/StudyHeader';
import useFlashcards from '../features/flashcards/hooks/useFlashcards';
import { colors, spacing, typography } from '../shared/theme';

/** Thin study screen: hooks + feature components only. */
export const FlashcardStudyScreen: React.FC = () => {
  const {
    deck,
    currentVerse,
    currentSegments,
    currentCardNumber,
    totalCards,
    correctCount,
    needsWorkCount,
    progress,
    isComplete,
    showCard,
    settings,
    markCorrect,
    markNeedsWork,
    restartFlashcards,
    setShuffleCards,
    setDefaultSide,
    toggleCategoryFilter,
    clearCategoryFilters,
    isSettingsOpen,
    openSettings,
    closeSettings,
  } = useFlashcards();

  const handleRestart = useCallback(() => {
    restartFlashcards();
    closeSettings();
  }, [restartFlashcards, closeSettings]);

  // Complete and empty-filter must not mount FlashcardStudyActive ("Tap to flip").
  const body = isComplete ? (
    <SessionComplete
      masteredCount={correctCount}
      practicingCount={needsWorkCount}
      totalCards={totalCards}
      onRestart={restartFlashcards}
    />
  ) : totalCards === 0 ? (
    <View style={styles.emptyFilter}>
      <Text style={styles.emptyTitle}>No cards match</Text>
      <Text style={styles.emptyCopy}>
        Clear or change category filters in Settings to continue studying.
      </Text>
    </View>
  ) : showCard && currentVerse !== undefined ? (
    <FlashcardStudyActive
      verse={currentVerse}
      segments={currentSegments}
      defaultSide={settings.defaultSide}
      onSwipeMastered={markCorrect}
      onSwipePracticing={markNeedsWork}
    />
  ) : (
    <SessionComplete
      masteredCount={correctCount}
      practicingCount={needsWorkCount}
      totalCards={totalCards}
      onRestart={restartFlashcards}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StudyHeader
        title={deck.title}
        current={currentCardNumber}
        total={totalCards}
        masteredCount={correctCount}
        practicingCount={needsWorkCount}
        progress={progress}
        onSettingsPress={openSettings}
      />

      {body}

      <SettingsBottomSheet visible={isSettingsOpen} onClose={closeSettings}>
        <FlashcardSettingsPanel
          settings={settings}
          onToggleCategory={toggleCategoryFilter}
          onClearCategories={clearCategoryFilters}
          onShuffleChange={setShuffleCards}
          onDefaultSideChange={setDefaultSide}
          onRestart={handleRestart}
        />
      </SettingsBottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyFilter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPaddingH,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.verseReference,
  },
  emptyCopy: {
    ...typography.hint,
    textAlign: 'center',
  },
});

export default FlashcardStudyScreen;
