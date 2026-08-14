import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import type { Card } from '../domain/card';

export interface FlashcardFrontProps {
  card: Card;
  style?: StyleProp<ViewStyle>;
}

/** Quote side — the verse reference on its own, centered. */
export const FlashcardFront: React.FC<FlashcardFrontProps> = React.memo(({ card, style }) => (
  <View style={[styles.container, style]}>
    <Text style={styles.reference}>{card.reference}</Text>
  </View>
));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  reference: {
    ...typography.verseReference,
    textAlign: 'center',
  },
});

export default FlashcardFront;
