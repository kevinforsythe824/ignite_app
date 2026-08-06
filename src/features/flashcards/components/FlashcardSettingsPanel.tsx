import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../shared/theme';
import type { CardSide, CategoryFilterId, FlashcardSettings } from '../types/settings';
import CategoryFilterTabs from './CategoryFilterTabs';
import DefaultSideSwitch from './DefaultSideSwitch';
import IndexLegend from './IndexLegend';
import SettingsToggle from './SettingsToggle';

export interface FlashcardSettingsPanelProps {
  settings: FlashcardSettings;
  onToggleCategory: (filterId: CategoryFilterId) => void;
  onShuffleChange: (value: boolean) => void;
  onPlayAudioChange: (value: boolean) => void;
  onDefaultSideChange: (side: CardSide) => void;
  onRestart: () => void;
}

/** Settings content composed inside the animated bottom sheet. */
export const FlashcardSettingsPanel: React.FC<FlashcardSettingsPanelProps> = React.memo(({
  settings,
  onToggleCategory,
  onShuffleChange,
  onPlayAudioChange,
  onDefaultSideChange,
  onRestart,
}) => (
  <ScrollView
    bounces={false}
    showsVerticalScrollIndicator={false}
    contentContainerStyle={styles.content}
  >
    <Text style={styles.heading}>Study Settings</Text>

    <IndexLegend />

    <View style={styles.divider} />

    <CategoryFilterTabs
      selected={settings.categoryFilters}
      onToggle={onToggleCategory}
    />

    <View style={styles.divider} />

    <SettingsToggle
      label="Shuffle Cards"
      description="Randomize the order of the active deck"
      value={settings.shuffleCards}
      onValueChange={onShuffleChange}
    />

    <SettingsToggle
      label="Play Audio"
      description="Enable verse audio when available"
      value={settings.playAudio}
      onValueChange={onPlayAudioChange}
    />

    <View style={styles.divider} />

    <DefaultSideSwitch
      value={settings.defaultSide}
      onChange={onDefaultSideChange}
    />

    <View style={styles.divider} />

    <Pressable
      onPress={onRestart}
      accessibilityRole="button"
      accessibilityLabel="Restart flashcards"
      style={({ pressed }) => [styles.restartButton, pressed && styles.restartPressed]}
    >
      <Text style={styles.restartLabel}>Restart Flashcards</Text>
    </Pressable>
  </ScrollView>
));

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  heading: {
    ...typography.verseReference,
    fontSize: 20,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
  },
  restartButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.practicingRedBg,
    borderWidth: 1,
    borderColor: colors.practicingRed,
  },
  restartPressed: {
    opacity: 0.75,
  },
  restartLabel: {
    ...typography.progressCounter,
    color: colors.practicingRed,
  },
});

export default FlashcardSettingsPanel;
