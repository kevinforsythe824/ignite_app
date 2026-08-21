import { Ionicons } from '@expo/vector-icons';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../../../shared/theme';
import { authCopy } from '../copy/authCopy';
import { AUTH_MIN_TOUCH_TARGET } from './authLayout';

export interface AuthScreenLayoutProps {
  children: ReactNode;
  onBack?: () => void;
  keyboardAvoiding?: boolean;
}

export function AuthScreenLayout({
  children,
  onBack,
  keyboardAvoiding = true,
}: AuthScreenLayoutProps): React.JSX.Element {
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
          <Ionicons name="chevron-back" size={24} color={colors.navy} />
          <Text style={styles.backLabel}>{authCopy.actions.back}</Text>
        </Pressable>
      ) : null}
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.brandWarmBackground,
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
