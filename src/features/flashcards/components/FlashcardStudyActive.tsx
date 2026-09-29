import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import type { CardSide } from '../types/settings';
import type { Card } from '../domain/card';
import type { VerseSegment } from '../types/verse';
import Flashcard from './Flashcard';
import { PREVIOUS_ICON_ENABLED_COLOR, PreviousCardIcon } from './PreviousCardIcon';

export interface FlashcardStudyActiveProps {
  card: Card;
  segments: VerseSegment[];
  defaultSide: CardSide;
  canGoPrevious: boolean;
  onPrevious: () => void;
  onSwipeCorrect: () => void;
  onSwipeNeedsWork: () => void;
}

/** Active study body: flip/swipe card, previous, and the tap hint. */
export const FlashcardStudyActive: React.FC<FlashcardStudyActiveProps> = React.memo(({
  card,
  segments,
  defaultSide,
  canGoPrevious,
  onPrevious,
  onSwipeCorrect,
  onSwipeNeedsWork,
}) => (
  <View style={styles.cardSection}>
    <View style={styles.cardArea}>
      <Flashcard
        card={card}
        segments={segments}
        defaultSide={defaultSide}
        onSwipeCorrect={onSwipeCorrect}
        onSwipeNeedsWork={onSwipeNeedsWork}
      />
    </View>
    <View style={styles.navRow}>
      <CardStepButton
        accessibilityLabel="Previous card"
        disabled={!canGoPrevious}
        onPress={onPrevious}
      />
      <Text
        style={styles.hint}
        accessibilityRole="text"
        accessibilityLabel="Tap to flip. Swipe right for correct, swipe left for needs work."
      >
        Tap to flip
      </Text>
      {/* Matches the previous control width so the hint stays centered. */}
      <View
        style={styles.stepButton}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </View>
  </View>
));

interface CardStepButtonProps {
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}

/** Icon step control. Stays mounted when disabled so the row does not shift. */
const CardStepButton: React.FC<CardStepButtonProps> = ({
  accessibilityLabel,
  disabled,
  onPress,
}) => (
  <Pressable
    onPress={() => {
      if (!disabled) {
        onPress();
      }
    }}
    disabled={disabled}
    hitSlop={spacing.sm}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    accessibilityState={{ disabled }}
    style={({ pressed }) => [
      styles.stepButton,
      pressed && !disabled ? styles.stepButtonPressed : null,
    ]}
  >
    <PreviousCardIcon
      color={disabled ? colors.disabledText : PREVIOUS_ICON_ENABLED_COLOR}
    />
  </Pressable>
);

const styles = StyleSheet.create({
  cardSection: {
    flex: 1,
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  cardArea: {
    flex: 1,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  hint: {
    ...typography.hint,
    flex: 1,
    textAlign: 'center',
  },
  stepButton: {
    minWidth: spacing.minTouchTarget,
    minHeight: spacing.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonPressed: {
    opacity: 0.7,
  },
});

export default FlashcardStudyActive;
