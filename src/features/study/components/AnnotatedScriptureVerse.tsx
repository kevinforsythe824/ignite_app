import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OfficialScriptureText } from '../../../shared/scripture';
import { spacing, typography } from '../../../shared/theme';
import type { Card } from '../../flashcards/domain/card';

export interface AnnotatedScriptureVerseProps {
  card: Card;
}

/**
 * One verse in the reading list. The reference is separate from the canonical
 * text so OfficialScriptureText can keep its scripture accessibility label.
 */
export const AnnotatedScriptureVerse = React.memo(function AnnotatedScriptureVerse({
  card,
}: AnnotatedScriptureVerseProps): React.JSX.Element {
  return (
    <View style={styles.verse} testID={`scripture-verse-${card.seasonId}-${card.materialSetId}-${card.cardId}`}>
      <Text
        accessibilityRole="text"
        accessibilityLabel={`Scripture reference, ${card.reference}`}
        style={styles.reference}
      >
        {card.reference}
      </Text>
      <OfficialScriptureText
        verseText={card.verseText}
        annotations={card.annotations}
        cardId={card.cardId}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  verse: {
    gap: spacing.xs,
    paddingBottom: spacing.lg,
  },
  reference: {
    ...typography.cardTitle,
  },
});
