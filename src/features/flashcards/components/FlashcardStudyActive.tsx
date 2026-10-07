import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import type { Card } from '../domain/card';
import type { CardSide } from '../types/settings';
import type { VerseSegment } from '../types/verse';
import Flashcard, { type FlashcardHandle } from './Flashcard';
import { PREVIOUS_ICON_ENABLED_COLOR, PreviousCardIcon } from './PreviousCardIcon';

const QUICK_ANSWER_CIRCLE_SIZE = 36;
const QUICK_ANSWER_BORDER_WIDTH = 1.5;
const QUICK_ANSWER_ICON_SIZE = 16;
const QUICK_ANSWER_PRESS_SCALE = 0.94;
/** No theme token is exactly #FEF2F2 (`practicingRedBg` is #FEE2E2). */
const NEEDS_WORK_QUICK_ANSWER_BACKGROUND = '#FEF2F2';
/** No theme token is exactly #F87171. */
const NEEDS_WORK_QUICK_ANSWER_BORDER = '#F87171';
/** No theme token is exactly #F0FDF4 (`masteredGreenBg` is #DCFCE7). */
const CORRECT_QUICK_ANSWER_BACKGROUND = '#F0FDF4';
/** No theme token is exactly #34D399. */
const CORRECT_QUICK_ANSWER_BORDER = '#34D399';
/** No existing theme token is #10B981 (`masteredGreen` is #22C55E). */
const CORRECT_QUICK_ANSWER_ICON = '#10B981';
const FLIP_HINT_ACCESSIBILITY_LABEL =
  'Tap to flip. Swipe right or press the check button for correct, swipe left or press the X button for needs work.';

export interface FlashcardStudyActiveProps {
  card: Card;
  segments: VerseSegment[];
  defaultSide: CardSide;
  canGoPrevious: boolean;
  onPrevious: () => void;
  onSwipeCorrect: () => void;
  onSwipeNeedsWork: () => void;
}

/** Active study body: flip/swipe card, previous, tap hint, and quick answers. */
export const FlashcardStudyActive: React.FC<FlashcardStudyActiveProps> = React.memo(({
  card,
  segments,
  defaultSide,
  canGoPrevious,
  onPrevious,
  onSwipeCorrect,
  onSwipeNeedsWork,
}) => {
  const flashcardRef = useRef<FlashcardHandle>(null);

  return (
    <View style={styles.cardSection}>
      <View style={styles.cardArea}>
        <Flashcard
          ref={flashcardRef}
          card={card}
          segments={segments}
          defaultSide={defaultSide}
          onSwipeCorrect={onSwipeCorrect}
          onSwipeNeedsWork={onSwipeNeedsWork}
        />
      </View>
      <View style={styles.navRow}>
        <View style={[styles.sideControls, styles.sideControlsStart]}>
          <CardStepButton
            accessibilityLabel="Previous card"
            disabled={!canGoPrevious}
            onPress={onPrevious}
          />
        </View>
        <Text
          style={styles.hint}
          accessibilityRole="text"
          accessibilityLabel={FLIP_HINT_ACCESSIBILITY_LABEL}
        >
          Tap to flip
        </Text>
        <View style={[styles.sideControls, styles.sideControlsEnd]}>
          <QuickAnswerButton
            accessibilityLabel="Mark as needs work"
            backgroundColor={NEEDS_WORK_QUICK_ANSWER_BACKGROUND}
            borderColor={NEEDS_WORK_QUICK_ANSWER_BORDER}
            icon="close"
            iconColor={colors.practicingRed}
            testID="needs-work-quick-answer"
            onPress={() => {
              flashcardRef.current?.swipe('left');
            }}
          />
          <QuickAnswerButton
            accessibilityLabel="Mark as correct"
            backgroundColor={CORRECT_QUICK_ANSWER_BACKGROUND}
            borderColor={CORRECT_QUICK_ANSWER_BORDER}
            icon="checkmark"
            iconColor={CORRECT_QUICK_ANSWER_ICON}
            testID="correct-quick-answer"
            onPress={() => {
              flashcardRef.current?.swipe('right');
            }}
          />
        </View>
      </View>
    </View>
  );
});

interface QuickAnswerButtonProps {
  accessibilityLabel: string;
  backgroundColor: string;
  borderColor: string;
  icon: 'close' | 'checkmark';
  iconColor: string;
  onPress: () => void;
  testID: string;
}

/** 44pt target with a 36pt circle. Press scale is tactile only; the card flies off separately. */
const QuickAnswerButton: React.FC<QuickAnswerButtonProps> = ({
  accessibilityLabel,
  backgroundColor,
  borderColor,
  icon,
  iconColor,
  onPress,
  testID,
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    onPress={onPress}
    style={({ pressed }) => [
      styles.quickAnswerHit,
      pressed ? styles.quickAnswerPressed : null,
    ]}
  >
    <View
      testID={testID}
      style={[styles.quickAnswerCircle, { backgroundColor, borderColor }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Ionicons name={icon} size={QUICK_ANSWER_ICON_SIZE} color={iconColor} />
    </View>
  </Pressable>
);

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
  sideControls: {
    width: spacing.minTouchTarget * 2,
    minHeight: spacing.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideControlsStart: {
    justifyContent: 'flex-start',
  },
  sideControlsEnd: {
    justifyContent: 'flex-end',
  },
  quickAnswerHit: {
    width: spacing.minTouchTarget,
    height: spacing.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAnswerPressed: {
    transform: [{ scale: QUICK_ANSWER_PRESS_SCALE }],
  },
  quickAnswerCircle: {
    width: QUICK_ANSWER_CIRCLE_SIZE,
    height: QUICK_ANSWER_CIRCLE_SIZE,
    borderRadius: QUICK_ANSWER_CIRCLE_SIZE / 2,
    borderWidth: QUICK_ANSWER_BORDER_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
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
