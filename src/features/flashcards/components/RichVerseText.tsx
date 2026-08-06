import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

import { colors, radius, typography } from '../../../shared/theme';
import { SegmentType, VerseMark, VerseSegment } from '../types/verse';

export interface RichVerseTextProps {
  segments: VerseSegment[];
  style?: StyleProp<TextStyle>;
}

const segmentStyles: Record<SegmentType, TextStyle> = StyleSheet.create({
  text: {
    color: colors.navy,
  },
  keyword1x: {
    color: colors.keyword1x,
  },
  keyword2x: {
    color: colors.keyword2x,
  },
  keyword3x: {
    color: colors.keyword3x,
  },
  highlight: {
    color: colors.navy,
    backgroundColor: colors.highlightYellow,
    borderRadius: radius.badge,
  },
  slash: {
    color: colors.navy,
  },
});

/**
 * Underlines layer over the keyword colour rather than replacing it, so a
 * highlighted word inside a unique phrase keeps its tier and gains the line.
 * `textDecorationColor` is honoured on iOS; Android draws the underline in the
 * text colour.
 */
const markStyles: Record<VerseMark, TextStyle> = StyleSheet.create({
  uniqueBeginning: {
    textDecorationLine: 'underline',
    textDecorationColor: colors.markUnique,
  },
  uniqueEnding: {
    textDecorationLine: 'underline',
    textDecorationColor: colors.markUnique,
  },
  question: {
    textDecorationLine: 'underline',
    textDecorationColor: colors.markQuestion,
  },
  exclamation: {
    textDecorationLine: 'underline',
    textDecorationColor: colors.markExclamation,
  },
});

export const RichVerseText: React.FC<RichVerseTextProps> = ({ segments, style }) => (
  <Text style={[styles.body, style]}>
    {segments.map((segment, index) => (
      <Text
        key={`${segment.type}-${segment.mark ?? 'plain'}-${index}`}
        style={[segmentStyles[segment.type], segment.mark === undefined ? null : markStyles[segment.mark]]}
      >
        {segment.content}
      </Text>
    ))}
  </Text>
);

const styles = StyleSheet.create({
  body: typography.verseBody,
});

export default RichVerseText;
