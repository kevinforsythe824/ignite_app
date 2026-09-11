import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '../../../shared/theme';

export type ScorePillVariant = 'correct' | 'needsWork';

export interface ScorePillProps {
  variant: ScorePillVariant;
  count: number;
  style?: StyleProp<ViewStyle>;
}

interface VariantConfig {
  icon: 'checkmark' | 'close';
  tint: string;
  background: string;
}

const variantConfig: Record<ScorePillVariant, VariantConfig> = {
  correct: {
    icon: 'checkmark',
    tint: colors.masteredGreen,
    background: colors.masteredGreenBg,
  },
  needsWork: {
    icon: 'close',
    tint: colors.practicingRed,
    background: colors.practicingRedBg,
  },
};

const accessibilityLabelFor = (variant: ScorePillVariant, count: number): string =>
  variant === 'correct' ? `${count} correct` : `${count} needs work`;

export const ScorePill: React.FC<ScorePillProps> = React.memo(({ variant, count, style }) => {
  const { icon, tint, background } = variantConfig[variant];

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabelFor(variant, count)}
      style={[styles.pill, { backgroundColor: background }, style]}
    >
      <Ionicons name={icon} size={16} color={tint} importantForAccessibility="no" />
      <Text style={[styles.count, { color: tint }]} importantForAccessibility="no">
        {count}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    gap: spacing.xs,
  },
  count: {
    ...typography.badgeCount,
  },
});

export default ScorePill;
