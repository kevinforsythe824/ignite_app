import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import { getAppVersion } from '../../../shared/utils/getAppVersion';
import { quizzerProfileCopy } from '../copy/quizzerProfileCopy';

/** Basic About / version information. */
export function AboutScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.appName} testID="about-app-name">
        {quizzerProfileCopy.about.appName}
      </Text>
      <Text style={styles.version} testID="about-version">
        {quizzerProfileCopy.about.versionLabel} {getAppVersion()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
  appName: {
    ...typography.title,
    fontSize: 22,
    color: colors.navy,
  },
  version: {
    ...typography.valueBody,
    color: colors.textSecondary,
  },
});
