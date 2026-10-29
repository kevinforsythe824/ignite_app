import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../../../shared/theme';

export interface StudyMessageProps {
  title: string;
  copy?: string;
  onRetry?: () => void;
  onBack?: () => void;
  /** Spoken name for the back control. Defaults to the existing Study label. */
  backAccessibilityLabel?: string;
  testID?: string;
}

/** Shared Study loading, empty, error, and section-scope messages. */
export function StudyMessage({
  title,
  copy,
  onRetry,
  onBack,
  backAccessibilityLabel = 'Go back',
  testID,
}: StudyMessageProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.message} testID={testID}>
        {onBack !== undefined ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel}
            hitSlop={spacing.sm}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.navy} />
          </Pressable>
        ) : null}
        <Text style={styles.title}>{title}</Text>
        {copy !== undefined ? <Text style={styles.copy}>{copy}</Text> : null}
        {onRetry !== undefined ? (
          <Pressable
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
          >
            <Text style={styles.retryLabel}>Try again</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  message: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPaddingH,
    gap: spacing.sm,
  },
  backButton: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.screenPaddingH,
    minWidth: spacing.minTouchTarget,
    minHeight: spacing.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.verseReference,
    textAlign: 'center',
  },
  copy: {
    ...typography.hint,
    textAlign: 'center',
  },
  retry: {
    marginTop: spacing.md,
    minHeight: spacing.minTouchTarget,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  retryLabel: {
    ...typography.title,
  },
});
