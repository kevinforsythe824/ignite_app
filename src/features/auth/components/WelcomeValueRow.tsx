import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../shared/theme';

export type WelcomeValueTone = 'coral' | 'blue' | 'gold';

export interface WelcomeValueRowProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: WelcomeValueTone;
}

/** Welcome value card. Icon is decorative for screen readers. */
export function WelcomeValueRow({
  title,
  description,
  icon,
  tone,
}: WelcomeValueRowProps): React.JSX.Element {
  const accent = TONE_ACCENTS[tone];

  return (
    <View
      style={[styles.card, { borderColor: accent.border }]}
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${description}`}
    >
      <View style={[styles.iconWell, { backgroundColor: accent.well }]}>
        <Ionicons
          name={icon}
          size={22}
          color={accent.icon}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>
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

/** Visual accents only — not product/business configuration. */
const TONE_ACCENTS: Record<
  WelcomeValueTone,
  { border: string; well: string; icon: string }
> = {
  coral: {
    border: '#E8C4BC',
    well: '#FCEAE6',
    icon: colors.accent,
  },
  blue: {
    border: '#C5D9EB',
    well: '#E8F1FA',
    icon: colors.keyword1x,
  },
  gold: {
    border: '#E8D5A8',
    well: '#FEF6E6',
    icon: colors.progressGradientStart,
  },
};

const ICON_WELL_SIZE = 44;

/**
 * Floor for the card box so the value stack fills the Welcome canvas.
 * A floor rather than extra padding keeps cards from over-growing at large text sizes.
 */
const CARD_MIN_HEIGHT = 92;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: CARD_MIN_HEIGHT,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radius.card,
  },
  iconWell: {
    width: ICON_WELL_SIZE,
    height: ICON_WELL_SIZE,
    borderRadius: radius.badge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.cardTitle,
  },
  description: {
    ...typography.bodySecondary,
  },
});
