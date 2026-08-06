import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';

interface LegendItem {
  label: string;
  sample: string;
  color: string;
}

const LEGEND_ITEMS: readonly LegendItem[] = [
  { label: '1x Keyword', sample: 'word', color: colors.keyword1x },
  { label: '2x Keyword', sample: 'word', color: colors.keyword2x },
  { label: '3x Keyword', sample: 'word', color: colors.keyword3x },
];

/** Color key for competitive keyword tiers shown on the Locate (verse) side. */
export const IndexLegend: React.FC = React.memo(() => (
  <View style={styles.container} accessibilityRole="summary">
    <Text style={styles.title}>Index Legend</Text>
    <View style={styles.row}>
      {LEGEND_ITEMS.map((item) => (
        <View key={item.label} style={styles.item}>
          <Text style={[styles.sample, { color: item.color }]}>{item.sample}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  sample: {
    fontSize: 16,
    fontWeight: '700',
  },
  label: {
    ...typography.hint,
    fontSize: 11,
    textAlign: 'center',
  },
});

export default IndexLegend;
