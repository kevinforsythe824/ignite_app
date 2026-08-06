import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '../../../shared/theme';

export interface SessionCompleteProps {
  masteredCount: number;
  practicingCount: number;
  totalCards: number;
  onRestart: () => void;
}

export const SessionComplete: React.FC<SessionCompleteProps> = React.memo(({
  masteredCount,
  practicingCount,
  totalCards,
  onRestart,
}) => (
  <View style={styles.completeSection}>
    <Ionicons name="trophy-outline" size={56} color={colors.accentRed} />
    <Text style={styles.completeTitle}>Deck complete</Text>
    <Text style={styles.completeSummary}>
      {`${masteredCount} mastered · ${practicingCount} to practice · ${totalCards} cards`}
    </Text>
    <Pressable
      onPress={onRestart}
      accessibilityRole="button"
      style={({ pressed }) => [styles.restartButton, pressed && styles.restartButtonPressed]}
    >
      <Text style={styles.restartLabel}>Study again</Text>
    </Pressable>
  </View>
));

const styles = StyleSheet.create({
  completeSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPaddingH,
    gap: spacing.md,
  },
  completeTitle: {
    ...typography.verseReference,
  },
  completeSummary: {
    ...typography.hint,
    textAlign: 'center',
  },
  restartButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.cardWhite,
    ...shadows.card,
  },
  restartButtonPressed: {
    opacity: 0.7,
  },
  restartLabel: {
    ...typography.title,
  },
});

export default SessionComplete;
