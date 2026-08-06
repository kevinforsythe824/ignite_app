import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import type { Verse } from '../types/verse';

export interface FlashcardFrontProps {
  verse: Verse;
  style?: StyleProp<ViewStyle>;
}

/** Locate side — the verse reference on its own, centered. */
export const FlashcardFront: React.FC<FlashcardFrontProps> = ({ verse, style }) => (
  <View style={[styles.container, style]}>
    <Text style={styles.reference}>{verse.reference}</Text>
  </View>
);

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
