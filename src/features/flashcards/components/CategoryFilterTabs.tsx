import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../shared/theme';
import {
  CATEGORY_FILTER_OPTIONS,
  type CategoryFilterId,
} from '../types/settings';

export interface CategoryFilterTabsProps {
  selected: readonly CategoryFilterId[];
  onToggle: (filterId: CategoryFilterId) => void;
}

/** Multi-select structural category chips for narrowing the active deck. */
export const CategoryFilterTabs: React.FC<CategoryFilterTabsProps> = React.memo(({
  selected,
  onToggle,
}) => (
  <View style={styles.container}>
    <Text style={styles.title}>Categories</Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabs}
    >
      {CATEGORY_FILTER_OPTIONS.map((option) => {
        const isActive = selected.includes(option.id);
        return (
          <Pressable
            key={option.id}
            onPress={() => onToggle(option.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Filter ${option.label}`}
            style={({ pressed }) => [
              styles.tab,
              isActive && styles.tabActive,
              pressed && styles.tabPressed,
            ]}
          >
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
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
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tabActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  tabPressed: {
    opacity: 0.75,
  },
  tabLabel: {
    ...typography.hint,
    fontWeight: '600',
    color: colors.navy,
  },
  tabLabelActive: {
    color: colors.cardWhite,
  },
});

export default CategoryFilterTabs;
