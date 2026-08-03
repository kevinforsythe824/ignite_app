import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

import { colors, radius, typography } from '../../constants/theme';
import { SegmentType, VerseSegment } from '../../types/verse';

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

export const RichVerseText: React.FC<RichVerseTextProps> = ({ segments, style }) => (
  <Text style={[styles.body, style]}>
    {segments.map((segment, index) => (
      <Text key={`${segment.type}-${index}`} style={segmentStyles[segment.type]}>
        {segment.content}
      </Text>
    ))}
  </Text>
);

const styles = StyleSheet.create({
  body: typography.verseBody,
});

export default RichVerseText;
