import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import type { VerseSegment } from '../types/verse';
import RichVerseText from './RichVerseText';

export interface FlashcardBackProps {
  segments: VerseSegment[];
  indexCode?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Locate side — legacy matchedRules verse body, with a competitive index code
 * when the card has one. Slice F renders OfficialScriptureText for official
 * annotations or RichVerseText for fixture cards. Do not render both for one card.
 */
export const FlashcardBack: React.FC<FlashcardBackProps> = React.memo(({ segments, indexCode, style }) => {
  const visibleIndexCode = indexCode?.trim() ?? '';
  return (
    <View style={[styles.container, style]}>
      <RichVerseText segments={segments} />
      {visibleIndexCode.length > 0 ? (
        <Text style={styles.indexCode}>{`(${visibleIndexCode})`}</Text>
      ) : null}
    </View>
  );
});

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
