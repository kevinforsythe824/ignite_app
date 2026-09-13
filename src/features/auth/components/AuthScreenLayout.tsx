import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../../../shared/theme';
import { authCopy } from '../copy/authCopy';
import { AUTH_MIN_TOUCH_TARGET } from './authLayout';

export type AuthScreenCanvas = 'warm' | 'system' | 'brand';

export interface AuthScreenLayoutProps {
  children: ReactNode;
  onBack?: () => void;
  keyboardAvoiding?: boolean;
  /**
   * Safe-area edges. Auth stack screens use top+bottom.
   * Nested Profile Settings forms omit top when the stack header already owns it.
   */
  edges?: readonly Edge[];
  /**
   * Canvas tone. Default `warm` preserves legacy cream for out-of-batch screens.
   * Auth / onboarding Brand Mode opts into `brand` (warm peach gradient).
   * `system` remains available for cool-white Product surfaces.
   */
  canvas?: AuthScreenCanvas;
}

export function AuthScreenLayout({
  children,
  onBack,
  keyboardAvoiding = true,
  edges = ['top', 'bottom'],
  canvas = 'warm',
}: AuthScreenLayoutProps): React.JSX.Element {
  const isBrand = canvas === 'brand';
  const isSystem = canvas === 'system';
  const chromeColor = isSystem || isBrand ? colors.textPrimary : colors.navy;

  const content = (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={authCopy.actions.back}
          hitSlop={8}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={24} color={chromeColor} />
          <Text style={[styles.backLabel, { color: chromeColor }]}>
            {authCopy.actions.back}
          </Text>
        </Pressable>
      ) : null}
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );

  const chrome = (
    <SafeAreaView
      style={[
        styles.safeArea,
        isBrand
          ? styles.safeAreaTransparent
          : isSystem
            ? styles.safeAreaSystem
            : styles.safeAreaWarm,
      ]}
      edges={edges}
    >
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );

  if (isBrand) {
    return (
      <View style={styles.brandRoot}>
        <LinearGradient
          colors={[colors.authBackgroundStart, colors.authBackgroundEnd]}
          style={StyleSheet.absoluteFill}
        />
        {chrome}
      </View>
    );
  }

  return chrome;
}

const styles = StyleSheet.create({
  brandRoot: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  safeAreaWarm: {
    backgroundColor: colors.brandWarmBackground,
  },
  safeAreaSystem: {
    backgroundColor: colors.background,
  },
  safeAreaTransparent: {
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.screenPaddingH,
    paddingBottom: spacing.xxl,
  },
  backButton: {
    minHeight: AUTH_MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  backLabel: {
    ...typography.title,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.7,
  },
  body: {
    flexGrow: 1,
    gap: spacing.lg,
  },
});
