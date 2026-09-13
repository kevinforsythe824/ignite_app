import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../shared/theme';
import { getAppVersion } from '../../../shared/utils/getAppVersion';
import { quizzerProfileCopy } from '../copy/quizzerProfileCopy';

const CARD_BORDER_WIDTH = 1;

/** Basic About / version information. */
export function AboutScreen(): React.JSX.Element {
  return (
    <View style={styles.container} testID="about-canvas">
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.appName} testID="about-app-name">
          {quizzerProfileCopy.about.appName}
        </Text>
        <Text style={styles.version} testID="about-version">
          {quizzerProfileCopy.about.versionLabel} {getAppVersion()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: CARD_BORDER_WIDTH,
    borderColor: colors.border,
    padding: spacing.cardPadding,
    gap: spacing.xs,
  },
  appName: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  version: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
  },
});
