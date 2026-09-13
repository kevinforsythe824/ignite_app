import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../shared/theme';

/** Caps line length on wide canvases so supporting copy stays readable. */
const CONTENT_MAX_WIDTH = 520;

export interface PlaceholderScreenProps {
  title: string;
  description: string;
}

/** Shared shell for future feature screens that are not built yet. */
export const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({ title, description }) => (
  <SafeAreaView style={styles.safeArea} edges={['top']} testID="placeholder-canvas">
    <View style={styles.content}>
      <Text accessibilityRole="header" style={styles.title} testID="placeholder-title">
        {title}
      </Text>
      <Text style={styles.description} testID="placeholder-description">
        {description}
      </Text>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.xl,
    gap: spacing.md,
    maxWidth: CONTENT_MAX_WIDTH,
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
  description: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
  },
});

export default PlaceholderScreen;
