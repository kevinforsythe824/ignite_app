import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';

export interface SettingsToggleProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel?: string;
}

/** Labeled boolean row used by Shuffle / Play Audio settings. */
export const SettingsToggle: React.FC<SettingsToggleProps> = React.memo(({
  label,
  description,
  value,
  onValueChange,
  accessibilityLabel,
}) => (
  <View style={styles.row}>
    <View style={styles.copy}>
      <Text style={styles.label}>{label}</Text>
      {description !== undefined ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.borderLight, true: colors.navy }}
      thumbColor={colors.cardWhite}
      ios_backgroundColor={colors.borderLight}
      accessibilityLabel={accessibilityLabel ?? label}
    />
  </View>
));

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    ...typography.progressCounter,
    color: colors.navy,
  },
  description: {
    ...typography.hint,
  },
});

export default SettingsToggle;
