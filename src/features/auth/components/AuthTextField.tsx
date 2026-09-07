import React, { forwardRef } from 'react';
import type { ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { colors, radius, spacing, typography } from '../../../shared/theme';
import { AUTH_MIN_TOUCH_TARGET } from './authLayout';

export type AuthTextFieldAppearance = 'legacy' | 'system';

export interface AuthTextFieldProps
  extends Omit<TextInputProps, 'style' | 'placeholder'> {
  label: string;
  error?: string;
  inputStyle?: TextInputProps['style'];
  endAccessory?: ReactNode;
  /**
   * Field chrome/type. Default `legacy` preserves progressCounter / verseBody / badge radius.
   * Batch 1 screens opt into `system` (`label` / `input` / `error` + `radius.control`).
   */
  appearance?: AuthTextFieldAppearance;
}

export const AuthTextField = forwardRef<TextInput, AuthTextFieldProps>(
  function AuthTextField(
    {
      label,
      error,
      editable = true,
      inputStyle,
      endAccessory,
      appearance = 'legacy',
      ...inputProps
    },
    ref,
  ): React.JSX.Element {
    const { secureTextEntry, ...restInputProps } = inputProps;
    const isSystem = appearance === 'system';

    return (
      <View style={styles.field}>
        <Text style={isSystem ? styles.labelSystem : styles.label}>{label}</Text>
        <View
          style={[
            styles.inputRow,
            isSystem ? styles.inputRowSystem : null,
            error ? styles.inputError : null,
          ]}
        >
          <TextInput
            // Remount when masking toggles so iOS reapplies secureTextEntry after autofill.
            key={secureTextEntry ? 'secure' : 'plain'}
            ref={ref}
            {...restInputProps}
            secureTextEntry={secureTextEntry}
            editable={editable}
            accessibilityLabel={label}
            accessibilityState={{ disabled: !editable }}
            placeholderTextColor={colors.textMuted}
            style={[
              isSystem ? styles.inputSystem : styles.input,
              secureTextEntry ? styles.secureEntry : null,
              inputStyle,
            ]}
          />
          {endAccessory}
        </View>
        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={isSystem ? styles.errorSystem : styles.error}
          >
            {error}
          </Text>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  label: {
    ...typography.progressCounter,
    color: colors.textPrimary,
  },
  labelSystem: {
    ...typography.label,
  },
  inputRow: {
    minHeight: AUTH_MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.badge,
    backgroundColor: colors.surface,
  },
  inputRowSystem: {
    borderRadius: radius.control,
  },
  input: {
    flex: 1,
    minHeight: AUTH_MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.verseBody,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  inputSystem: {
    flex: 1,
    minHeight: AUTH_MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.input,
  },
  /**
   * Custom fonts make iOS secure-entry bullets inconsistently sized across fields.
   * Use the platform UI face while masked so Password / Confirm match.
   */
  secureEntry: {
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: undefined,
    }),
    letterSpacing: 0,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    ...typography.hint,
    color: colors.danger,
  },
  errorSystem: {
    ...typography.error,
  },
});
