import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import {
  FREQUENCY_SUPERSCRIPT_GLYPH,
  officialFrequencyTextColor,
} from '../../../shared/scripture/officialFrequencyStyle';
import type { OfficialFrequencyTier } from '../../../shared/scripture/segmentOfficialAnnotations';
import {
  isOfficialFrequencyFilterId,
  OFFICIAL_CATEGORY_FILTER_OPTIONS,
  OFFICIAL_FREQUENCY_FILTER_TIER,
} from '../types/settings';

const STRUCTURAL_OPTIONS = OFFICIAL_CATEGORY_FILTER_OPTIONS.filter(
  (option) => option.id === 'uniqueBeginning' || option.id === 'uniqueEnding',
);
const FREQUENCY_OPTIONS = OFFICIAL_CATEGORY_FILTER_OPTIONS.filter((option) =>
  isOfficialFrequencyFilterId(option.id),
);

function spokenLabel(label: string, accessibilityLabel?: string): string {
  return accessibilityLabel ?? label;
}

/** Compact key for official bold beginnings, underlined endings, and frequency tiers 1–5. */
export const OfficialIndexLegend: React.FC = React.memo(() => (
  <View style={styles.container} accessibilityRole="summary">
    <Text style={styles.title}>Index Legend</Text>

    <View style={styles.structuralRow}>
      {STRUCTURAL_OPTIONS.map((option) => {
        const spoken = spokenLabel(option.label, option.accessibilityLabel);
        const isBeginning = option.id === 'uniqueBeginning';
        return (
          <View
            key={option.id}
            accessible
            style={styles.structuralCard}
            accessibilityLabel={
              isBeginning
                ? `${spoken}: bold word`
                : `${spoken}: underlined word`
            }
          >
            <Text
              style={isBeginning ? styles.beginningSample : styles.endingSample}
            >
              word
            </Text>
            <Text style={styles.cardLabel}>{option.label}</Text>
          </View>
        );
      })}
    </View>

    <View style={styles.frequencyRow}>
      {FREQUENCY_OPTIONS.map((option) => {
        if (!isOfficialFrequencyFilterId(option.id)) {
          return null;
        }
        const tier: OfficialFrequencyTier = OFFICIAL_FREQUENCY_FILTER_TIER[option.id];
        const spoken = spokenLabel(option.label, option.accessibilityLabel);
        return (
          <View
            key={option.id}
            accessible
            style={styles.frequencyCard}
            accessibilityLabel={`${spoken}: colored word with superscript ${tier}`}
          >
            <Text style={styles.frequencySampleRow}>
              <Text style={[styles.frequencySample, { color: officialFrequencyTextColor[tier] }]}>
                word
              </Text>
              <Text
                style={[styles.superscript, { color: officialFrequencyTextColor[tier] }]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {FREQUENCY_SUPERSCRIPT_GLYPH[tier]}
              </Text>
            </Text>
            <Text style={styles.cardLabel}>{option.label}</Text>
          </View>
        );
      })}
    </View>
  </View>
));

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    ...typography.progressCounter,
    color: colors.navy,
  },
  structuralRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  structuralCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  beginningSample: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
  },
  endingSample: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.navy,
    textDecorationLine: 'underline',
  },
  frequencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  frequencyCard: {
    flexGrow: 1,
    flexBasis: '30%',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 10,
    backgroundColor: colors.cardWhite,
  },
  frequencySampleRow: {
    fontSize: 16,
  },
  frequencySample: {
    fontSize: 16,
    fontWeight: '700',
  },
  superscript: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardLabel: {
    ...typography.hint,
    fontSize: 11,
    textAlign: 'center',
    // Hint gray is 4.44:1 on the structural tile. Navy stays above 4.5:1 there and on white.
    color: colors.navy,
  },
});

export default OfficialIndexLegend;
