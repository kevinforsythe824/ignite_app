import React from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '../../../shared/theme';
import { AuthScreenLayout } from '../../auth/components/AuthScreenLayout';

export interface SeasonSetupScreenFrameProps {
  title: string;
  titleTestID: string;
  onBack?: () => void;
  children: ReactNode;
}

/** Brand-canvas frame for Season Setup. No logo lockup and no step counter. */
export function SeasonSetupScreenFrame({
  title,
  titleTestID,
  onBack,
  children,
}: SeasonSetupScreenFrameProps): React.JSX.Element {
  return (
    <AuthScreenLayout canvas="brand" onBack={onBack}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title} testID={titleTestID}>
          {title}
        </Text>
      </View>
      <View style={styles.body}>{children}</View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },
  title: {
    ...typography.screenTitle,
  },
  body: {
    gap: spacing.lg,
  },
});
