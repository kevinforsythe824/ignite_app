import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../shared/theme';
import type { CardSide } from '../types/settings';

export interface DefaultSideSwitchProps {
  value: CardSide;
  onChange: (side: CardSide) => void;
}

const SIDES: readonly { id: CardSide; label: string }[] = [
  { id: 'quote', label: 'Quote' },
  { id: 'locate', label: 'Locate' },
];

/** Segmented control for which card face appears first. */
export const DefaultSideSwitch: React.FC<DefaultSideSwitchProps> = React.memo(({
  value,
  onChange,
}) => (
  <View style={styles.container}>
    <Text style={styles.title}>Default Side</Text>
    <View style={styles.segment}>
      {SIDES.map((side) => {
        const isActive = value === side.id;
        return (
          <Pressable
            key={side.id}
            onPress={() => onChange(side.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Default side ${side.label}`}
            style={({ pressed }) => [
              styles.option,
              isActive && styles.optionActive,
              pressed && styles.optionPressed,
            ]}
          >
            <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
              {side.label}
            </Text>
          </Pressable>
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
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  optionActive: {
    backgroundColor: colors.navy,
  },
  optionPressed: {
    opacity: 0.8,
  },
  optionLabel: {
    ...typography.hint,
    fontWeight: '700',
    color: colors.navy,
  },
  optionLabelActive: {
    color: colors.cardWhite,
  },
});

export default DefaultSideSwitch;
