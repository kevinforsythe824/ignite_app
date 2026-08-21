import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import { AUTH_MIN_TOUCH_TARGET } from './authLayout';

export interface AuthTextLinkProps {
  label: string;
  onPress: () => void;
  prompt?: string;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * Shared secondary / contextual text action for auth screens
 * (Welcome Sign In, Forgot Password, etc.).
 */
export function AuthTextLink({
  label,
  onPress,
  prompt,
  disabled = false,
  testID,
  accessibilityLabel,
}: AuthTextLinkProps): React.JSX.Element {
  const a11yLabel = accessibilityLabel ?? (prompt ? `${prompt} ${label}` : label);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.row,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <View style={styles.textRow}>
        {prompt ? <Text style={styles.prompt}>{prompt} </Text> : null}
        <Text style={styles.link}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: AUTH_MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  textRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prompt: {
    ...typography.hint,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  link: {
    ...typography.title,
    fontSize: 15,
    lineHeight: 22,
    color: colors.navy,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
