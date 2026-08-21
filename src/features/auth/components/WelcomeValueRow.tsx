import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';

export interface WelcomeValueRowProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

/** Lightweight Welcome value row. Icon is decorative for screen readers. */
export function WelcomeValueRow({
  title,
  description,
  icon,
}: WelcomeValueRowProps): React.JSX.Element {
  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${description}`}
    >
      <Ionicons
        name={icon}
        size={22}
        color={colors.accentRed}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <View style={styles.copy}>
        <Text style={styles.title} accessibilityElementsHidden importantForAccessibility="no">
          {title}
        </Text>
        <Text
          style={styles.description}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.valueTitle,
  },
  description: {
    ...typography.valueBody,
  },
});
