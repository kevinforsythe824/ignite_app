import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../shared/theme';

interface KeywordLegendItem {
  label: string;
  sample: string;
  color: string;
}

interface CategoryLegendItem {
  label: string;
  backgroundColor: string;
}

type StructuralMarkKind =
  | 'uniqueBeginning'
  | 'uniqueEnding'
  | 'question'
  | 'exclamation';

interface StructuralLegendItem {
  kind: StructuralMarkKind;
  label: string;
  underlineColor: string;
}

const KEYWORD_ITEMS: readonly KeywordLegendItem[] = [
  { label: '1x Keyword', sample: 'word', color: colors.keyword1x },
  { label: '2x Keyword', sample: 'word', color: colors.keyword2x },
  { label: '3x Keyword', sample: 'word', color: colors.keyword3x },
];

/** Soft pill fills adapted from the design reference; legend-only for now. */
const CATEGORY_ITEMS: readonly CategoryLegendItem[] = [
  { label: 'Animals', backgroundColor: '#C7D7F5' },
  { label: 'Proper Name', backgroundColor: '#F5E6A3' },
  { label: 'Body Parts', backgroundColor: '#F5C9A8' },
  { label: 'Geo Location', backgroundColor: '#C8E6C9' },
];

const STRUCTURAL_ITEMS: readonly StructuralLegendItem[] = [
  { kind: 'uniqueBeginning', label: 'Unique Beg.', underlineColor: colors.markUnique },
  { kind: 'uniqueEnding', label: 'Unique End.', underlineColor: colors.markUnique },
  { kind: 'question', label: 'Questions', underlineColor: colors.markQuestion },
  { kind: 'exclamation', label: 'Exclamations', underlineColor: colors.markExclamation },
];

const KeywordSampleCard: React.FC<KeywordLegendItem> = ({ label, sample, color }) => (
  <View style={styles.card} accessibilityLabel={`${label}: colored word sample`}>
    <Text style={[styles.keywordSample, { color }]}>{sample}</Text>
    <Text style={styles.cardLabel}>{label}</Text>
  </View>
);

const CategoryPill: React.FC<CategoryLegendItem> = ({ label, backgroundColor }) => (
  <View
    style={[styles.categoryPill, { backgroundColor }]}
    accessibilityLabel={`Category tag: ${label}`}
  >
    <Text style={styles.categoryPillLabel}>{label}</Text>
  </View>
);

/** Sample mimics RichVerseText: underline on the word; slashes sit outside for unique marks. */
const StructuralSampleCard: React.FC<StructuralLegendItem> = ({
  kind,
  label,
  underlineColor,
}) => {
  const sampleStyle = [styles.structuralSample, { textDecorationColor: underlineColor }];

  return (
    <View
      style={[styles.card, styles.structuralCard]}
      accessibilityLabel={`${label}: underline mark sample`}
    >
      <View style={styles.structuralSampleRow}>
        {kind === 'uniqueEnding' ? <Text style={styles.slashGlyph}>{'\\'}</Text> : null}
        <Text style={sampleStyle}>word</Text>
        {kind === 'uniqueBeginning' ? <Text style={styles.slashGlyph}>/</Text> : null}
      </View>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
};

/** Color key for competitive keyword tiers, category tags, and structural marks. */
export const IndexLegend: React.FC = React.memo(() => (
  <View style={styles.container} accessibilityRole="summary">
    <Text style={styles.title}>Index Legend</Text>

    <View style={styles.row}>
      {KEYWORD_ITEMS.map((item) => (
        <KeywordSampleCard key={item.label} {...item} />
      ))}
    </View>

    <View style={styles.categoryGrid}>
      {CATEGORY_ITEMS.map((item) => (
        <CategoryPill key={item.label} {...item} />
      ))}
    </View>

    <View style={styles.structuralRow}>
      {STRUCTURAL_ITEMS.map((item) => (
        <StructuralSampleCard key={item.label} {...item} />
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
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  /** Two-up wrap: four equal cells, matching structural grid rhythm. */
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  structuralRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  /** Two-up wrap so four structural samples stay readable on phone widths. */
  structuralCard: {
    flexGrow: 1,
    flexBasis: '46%',
    maxWidth: '48%',
  },
  keywordSample: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardLabel: {
    ...typography.hint,
    fontSize: 11,
    textAlign: 'center',
  },
  categoryPill: {
    flexGrow: 1,
    flexBasis: '46%',
    maxWidth: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  categoryPillLabel: {
    ...typography.hint,
    fontWeight: '600',
    color: colors.navy,
    textAlign: 'center',
  },
  structuralSampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  structuralSample: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
    textDecorationLine: 'underline',
  },
  slashGlyph: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
  },
});

export default IndexLegend;
