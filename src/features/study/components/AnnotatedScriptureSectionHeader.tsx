import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../../../shared/theme';

export interface AnnotatedScriptureSectionHeaderProps {
  sectionId: string;
  title: string;
  count: number;
}

function verseCountLabel(count: number): string {
  return count === 1 ? '1 verse' : `${count} verses`;
}

/** Official section title. The count is this section's resolved membership. */
export const AnnotatedScriptureSectionHeader = React.memo(function AnnotatedScriptureSectionHeader({
  sectionId,
  title,
  count,
}: AnnotatedScriptureSectionHeaderProps): React.JSX.Element {
  const countLabel = count > 0 ? verseCountLabel(count) : undefined;
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={countLabel === undefined ? title : `${title}, ${countLabel}`}
      style={styles.header}
      testID={`scripture-section-${sectionId}`}
    >
      <Text style={styles.title}>{title}</Text>
      {countLabel !== undefined ? <Text style={styles.count}>{countLabel}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  title: {
    ...typography.sectionTitle,
  },
  count: {
    ...typography.bodySecondary,
  },
});
