import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';

const MIN_TOUCH_TARGET = 44;

export interface SettingsRowProps {
  label: string;
  onPress: () => void;
  value?: string;
  testID?: string;
  showChevron?: boolean;
}

/** Accessible navigation / action row for Settings. */
export function SettingsRow({
  label,
  onPress,
  value,
  testID,
  showChevron = true,
}: SettingsRowProps): React.JSX.Element {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.labelBlock}>
        <Text style={styles.label}>{label}</Text>
        {value ? <Text style={styles.value}>{value}</Text> : null}
      </View>
      {showChevron ? (
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.cardWhite,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  labelBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    ...typography.valueBody,
    color: colors.navy,
  },
  value: {
    ...typography.hint,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.7,
  },
});
