import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import type { VerseSegment } from '../types/verse';
import RichVerseText from './RichVerseText';

export interface FlashcardBackProps {
  segments: VerseSegment[];
  indexCode: string;
  style?: StyleProp<ViewStyle>;
}

/** Quote side — rich verse body with the competitive index code beneath it. */
export const FlashcardBack: React.FC<FlashcardBackProps> = React.memo(({ segments, indexCode, style }) => (
  <View style={[styles.container, style]}>
    <RichVerseText segments={segments} />
    <Text style={styles.indexCode}>{`(${indexCode})`}</Text>
  </View>
));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  indexCode: {
    ...typography.indexCode,
    marginTop: spacing.md,
  },
});

export default FlashcardBack;
