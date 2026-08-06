import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/theme';
import type { Verse } from '../../types/verse';
import parseVerseToSegments from '../../utils/parseVerseToSegments';
import RichVerseText from './RichVerseText';

export interface FlashcardBackProps {
  verse: Verse;
  style?: StyleProp<ViewStyle>;
}

/** Quote side — rich verse body with the competitive index code beneath it. */
export const FlashcardBack: React.FC<FlashcardBackProps> = ({ verse, style }) => {
  const segments = useMemo(() => parseVerseToSegments(verse), [verse]);

  return (
    <View style={[styles.container, style]}>
      <RichVerseText segments={segments} />
      <Text style={styles.indexCode}>{`(${verse.index_code})`}</Text>
    </View>
  );
};

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
