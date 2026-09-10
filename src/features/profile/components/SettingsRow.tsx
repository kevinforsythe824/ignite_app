import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';

const CHEVRON_SIZE = 20;

/**
 * Row chrome shared by grouped Settings cards so in-card titles, separators, and
 * read-only display rows line up with pressable rows.
 */
export const settingsRowLayout = {
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.lg,
  iconSize: 22,
  gap: spacing.md,
} as const;

export type SettingsRowIcon = React.ComponentProps<typeof Ionicons>['name'];

export interface SettingsRowProps {
  label: string;
  onPress: () => void;
  value?: string;
  testID?: string;
  showChevron?: boolean;
  /** Optional leading outline icon. */
  icon?: SettingsRowIcon;
}

/** Accessible navigation / action row for Settings-family grouped cards. */
export function SettingsRow({
  label,
  onPress,
  value,
  testID,
  showChevron = true,
  icon,
}: SettingsRowProps): React.JSX.Element {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {icon ? (
        <Ionicons name={icon} size={settingsRowLayout.iconSize} color={colors.textPrimary} />
      ) : null}
      <View style={styles.labelBlock}>
        <Text style={styles.label}>{label}</Text>
        {value ? <Text style={styles.value}>{value}</Text> : null}
      </View>
      {showChevron ? (
        <Ionicons name="chevron-forward" size={CHEVRON_SIZE} color={colors.textMuted} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: spacing.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: settingsRowLayout.paddingVertical,
    paddingHorizontal: settingsRowLayout.paddingHorizontal,
    backgroundColor: colors.surface,
    gap: settingsRowLayout.gap,
  },
  labelBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  value: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.7,
  },
});
