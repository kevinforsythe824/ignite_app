import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import type { Verse, VerseSegment } from '../types/verse';
import Flashcard from './Flashcard';

export interface FlashcardStudyActiveProps {
  verse: Verse;
  segments: VerseSegment[];
  onSwipeMastered: () => void;
  onSwipePracticing: () => void;
}

/** Active study body: flip/swipe card plus the tap hint. */
export const FlashcardStudyActive: React.FC<FlashcardStudyActiveProps> = React.memo(({
  verse,
  segments,
  onSwipeMastered,
  onSwipePracticing,
}) => (
  <View style={styles.cardSection}>
    <View style={styles.cardArea}>
      <Flashcard
        verse={verse}
        segments={segments}
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
