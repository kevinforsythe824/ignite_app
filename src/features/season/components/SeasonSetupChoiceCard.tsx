import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../shared/theme';
import { seasonSetupCopy } from '../copy/seasonSetupCopy';

export interface SeasonSetupChoiceCardProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  supportingText?: string;
  testID?: string;
}

/**
 * Radio-style single choice for Season Setup.
 * Selected state uses a checkmark and the word Selected, not color alone.
 */
export function SeasonSetupChoiceCard({
  label,
  selected,
  onPress,
  disabled = false,
  supportingText,
  testID,
}: SeasonSetupChoiceCardProps): React.JSX.Element {
  const accessibilityLabel = supportingText ? `${label}. ${supportingText}` : label;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled, checked: selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected ? styles.cardSelected : null,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.label}>{label}</Text>
          {supportingText ? <Text style={styles.supporting}>{supportingText}</Text> : null}
        </View>
        {selected ? (
          <View style={styles.selectedMark}>
            <Ionicons name="checkmark-circle" size={22} color={colors.authAccent} />
            <Text style={styles.selectedText}>{seasonSetupCopy.choice.selected}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: spacing.minTouchTarget,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  cardSelected: {
    borderColor: colors.authAccent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  copy: {
    flexShrink: 1,
    gap: spacing.xs,
  },
  label: {
    ...typography.cardTitle,
  },
  supporting: {
    ...typography.bodySecondary,
  },
  selectedMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  selectedText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
