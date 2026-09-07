import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { colors } from '../../../shared/theme';
import { authCopy } from '../copy/authCopy';
import { AUTH_MIN_TOUCH_TARGET } from './authLayout';
import { AuthTextField, type AuthTextFieldProps } from './AuthTextField';

export type AuthPasswordFieldProps = Omit<
  AuthTextFieldProps,
  'secureTextEntry' | 'autoCorrect' | 'autoCapitalize' | 'endAccessory'
>;

export const AuthPasswordField = forwardRef<TextInput, AuthPasswordFieldProps>(
  function AuthPasswordField(props, ref): React.JSX.Element {
    const [visible, setVisible] = useState(false);
    const toggleLabel = visible
      ? authCopy.fields.hidePassword
      : authCopy.fields.showPassword;

    return (
      <AuthTextField
        ref={ref}
        {...props}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={!visible}
        endAccessory={
          <Pressable
            onPress={() => setVisible((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={toggleLabel}
            hitSlop={8}
            style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
          >
            <Ionicons
              name={visible ? 'eye-outline' : 'eye-off-outline'}
              size={22}
              color={colors.textPrimary}
            />
          </Pressable>
        }
      />
    );
  },
);

const styles = StyleSheet.create({
  toggle: {
    minWidth: AUTH_MIN_TOUCH_TARGET,
    minHeight: AUTH_MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
