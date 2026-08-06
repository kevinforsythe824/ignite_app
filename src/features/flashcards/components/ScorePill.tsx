import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '../../../shared/theme';

export type ScorePillVariant = 'mastered' | 'practicing';

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
  mastered: {
    icon: 'checkmark',
    tint: colors.masteredGreen,
    background: colors.masteredGreenBg,
  },
  practicing: {
    icon: 'close',
    tint: colors.practicingRed,
    background: colors.practicingRedBg,
  },
};

export const ScorePill: React.FC<ScorePillProps> = ({ variant, count, style }) => {
  const { icon, tint, background } = variantConfig[variant];

  return (
    <View style={[styles.pill, { backgroundColor: background }, style]}>
      <Ionicons name={icon} size={16} color={tint} />
      <Text style={[styles.count, { color: tint }]}>{count}</Text>
    </View>
  );
};

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
