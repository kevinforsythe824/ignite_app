import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

import { colors, fonts, typography } from '../theme';
import { FREQUENCY_SUPERSCRIPT_GLYPH, officialFrequencyTextColor } from './officialFrequencyStyle';
import {
  segmentOfficialAnnotations,
  type OfficialFrequencyIndicator,
  type OfficialScriptureAnnotationInput,
  type OfficialScriptureRun,
  type OfficialScriptureSegmentation,
} from './segmentOfficialAnnotations';

export interface OfficialScriptureTextProps {
  verseText: string;
  annotations?: readonly OfficialScriptureAnnotationInput[] | null;
  /**
   * When set, annotations for a different card are dropped.
   * Omit it only when the caller has no card identity to check.
   */
  cardId?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Official scripture formatting for Card.annotations.
 * Flashcards still render legacy matchedRules through RichVerseText.
 * Slice F selects one source at the presentation boundary (flashcard back
 * and the annotated scripture list). This component does not read matchedRules
 * and must not be combined with RichVerseText for the same card.
 */
export const OfficialScriptureText = React.memo(function OfficialScriptureText({
  verseText,
  annotations,
  cardId,
  style,
}: OfficialScriptureTextProps) {
  const segmentation = useMemo(
    () => segmentOfficialAnnotations({ verseText, annotations, cardId }),
    [verseText, annotations, cardId],
  );

  return (
    <Text
      testID="official-scripture-text"
      accessible
      accessibilityRole="text"
      accessibilityLabel={verseText}
      style={[styles.body, style]}
    >
      {layoutPieces(segmentation)}
    </Text>
  );
});

function layoutPieces(segmentation: OfficialScriptureSegmentation): React.ReactNode[] {
  const pieces: React.ReactNode[] = [];
  let indicatorIndex = 0;

  const takeIndicators = (offset: number) => {
    while (indicatorIndex < segmentation.indicators.length) {
      const indicator = segmentation.indicators[indicatorIndex];
      if (indicator === undefined || indicator.offset !== offset) {
        break;
      }
      pieces.push(renderIndicator(indicator, indicatorIndex));
      indicatorIndex += 1;
    }
  };

  takeIndicators(0);
  for (const run of segmentation.runs) {
    pieces.push(renderRun(run));
    takeIndicators(run.end);
  }

  return pieces;
}

function renderRun(run: OfficialScriptureRun): React.ReactElement {
  return (
    <Text key={`run-${run.start}-${run.end}`} testID="scripture-run" style={runStyle(run)}>
      {run.text}
    </Text>
  );
}

/**
 * Index is first so sibling keys stay unique when ids are missing or repeated
 * and when distinct frequencies end at the same offset. Sort order makes an
 * unchanged indicator list keep the same keys.
 */
function indicatorKey(indicator: OfficialFrequencyIndicator, index: number): string {
  return `indicator-${index}-${indicator.offset}-${indicator.annotationId ?? 'anon'}`;
}

function renderIndicator(indicator: OfficialFrequencyIndicator, index: number): React.ReactElement {
  return (
    <Text
      key={indicatorKey(indicator, index)}
      testID="scripture-frequency-indicator"
      accessible={false}
      importantForAccessibility="no"
      accessibilityElementsHidden
      style={indicatorStyle(indicator.tier)}
    >
      {FREQUENCY_SUPERSCRIPT_GLYPH[indicator.tier]}
    </Text>
  );
}

function runStyle(run: OfficialScriptureRun): TextStyle {
  const color = run.frequencyTier === undefined ? colors.navy : officialFrequencyTextColor[run.frequencyTier];
  return {
    color,
    fontFamily: run.bold ? fonts.bold : fonts.regular,
    fontWeight: run.bold ? '700' : '400',
    textDecorationLine: run.underline ? 'underline' : 'none',
    ...(run.underline ? { textDecorationColor: color } : {}),
  };
}

function indicatorStyle(tier: OfficialFrequencyIndicator['tier']): TextStyle {
  return {
    color: officialFrequencyTextColor[tier],
    fontFamily: fonts.regular,
    fontWeight: '400',
    textDecorationLine: 'none',
  };
}

const styles = StyleSheet.create({
  body: typography.verseBody,
});
