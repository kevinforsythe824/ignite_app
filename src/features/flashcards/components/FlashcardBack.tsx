import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { OfficialScriptureText } from '../../../shared/scripture';
import { spacing, typography } from '../../../shared/theme';
import type { CardAnnotation } from '../domain/card';
import {
  DEFAULT_SCRIPTURE_PRESENTATION,
  type ScripturePresentationMode,
} from '../scripturePresentation';
import type { VerseSegment } from '../types/verse';
import RichVerseText from './RichVerseText';

export interface FlashcardBackProps {
  segments: VerseSegment[];
  indexCode?: string;
  style?: StyleProp<ViewStyle>;
  /**
   * Trusted formatting source. Defaults to legacy so existing callers keep
   * RichVerseText. Official and legacy are never combined for one card.
   */
  scripturePresentation?: ScripturePresentationMode;
  /** Official Locate text. Ignored while presentation is legacy. */
  verseText?: string;
  /** Official annotations. Ignored while presentation is legacy. */
  annotations?: readonly CardAnnotation[] | null;
  /** Drops annotations that belong to a different card. */
  cardId?: string;
}

/**
 * Locate side — the verse, plus a competitive index code when the card has one.
 * Official: Card.verseText + Card.annotations through OfficialScriptureText.
 * Legacy: matchedRules segments through RichVerseText.
 * If a card carries both, scripturePresentation wins. Do not render both.
 * Index code stays separate and is never synthesized from annotations.
 * A future scripture list item should render Card.reference, Card.verseText,
 * and Card.annotations through the same OfficialScriptureText.
 */
export const FlashcardBack: React.FC<FlashcardBackProps> = React.memo(({
  segments,
  indexCode,
  style,
  scripturePresentation = DEFAULT_SCRIPTURE_PRESENTATION,
  verseText = '',
  annotations,
  cardId,
}) => {
  const visibleIndexCode = indexCode?.trim() ?? '';
  const scripture =
    scripturePresentation === 'official' ? (
      <OfficialScriptureText verseText={verseText} annotations={annotations} cardId={cardId} />
    ) : (
      <RichVerseText segments={segments} />
    );

  return (
    <View style={[styles.container, style]}>
      {scripture}
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
