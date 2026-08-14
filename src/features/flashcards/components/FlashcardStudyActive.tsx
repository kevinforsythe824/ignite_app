import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import type { CardSide } from '../types/settings';
import type { Card } from '../domain/card';
import type { VerseSegment } from '../types/verse';
import Flashcard from './Flashcard';

export interface FlashcardStudyActiveProps {
  card: Card;
  segments: VerseSegment[];
  defaultSide: CardSide;
  onSwipeMastered: () => void;
  onSwipePracticing: () => void;
}

/** Active study body: flip/swipe card plus the tap hint. */
export const FlashcardStudyActive: React.FC<FlashcardStudyActiveProps> = React.memo(({
  card,
  segments,
  defaultSide,
  onSwipeMastered,
  onSwipePracticing,
}) => (
  <View style={styles.cardSection}>
    <View style={styles.cardArea}>
      <Flashcard
        card={card}
        segments={segments}
        defaultSide={defaultSide}
        onSwipeMastered={onSwipeMastered}
        onSwipePracticing={onSwipePracticing}
      />
    </View>
    <Text style={styles.hint}>Tap to flip</Text>
  </View>
));

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
  hint: {
    ...typography.hint,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});

export default FlashcardStudyActive;
