import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '../../../shared/theme';
import { AUTH_MIN_TOUCH_TARGET } from './authLayout';

export interface AuthPrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  testID?: string;
}

export function AuthPrimaryButton({
  label,
  onPress,
  loading = false,
  loadingLabel,
  disabled = false,
  variant = 'primary',
  testID,
}: AuthPrimaryButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading;
  const accessibilityLabel = loading ? (loadingLabel ?? label) : label;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' ? styles.secondary : styles.primary,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          accessibilityElementsHidden
          importantForAccessibility="no"
          color={variant === 'secondary' ? colors.navy : colors.cardWhite}
        />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'secondary' ? styles.secondaryLabel : styles.primaryLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: AUTH_MIN_TOUCH_TARGET,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  primary: {
    backgroundColor: colors.accentRed,
    ...shadows.card,
  },
  secondary: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.sm,
  },
  primaryLabel: {
    ...typography.title,
    color: colors.cardWhite,
  },
  secondaryLabel: {
    ...typography.title,
    color: colors.navy,
  },
  label: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
