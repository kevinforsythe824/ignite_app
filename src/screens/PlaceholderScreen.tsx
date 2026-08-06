import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../shared/theme';

export interface PlaceholderScreenProps {
  title: string;
  description: string;
}

/** Shared shell for future feature screens that are not built yet. */
export const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({ title, description }) => (
  <SafeAreaView style={styles.safeArea} edges={['top']}>
    <View style={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPaddingH,
    gap: spacing.sm,
  },
  title: {
    ...typography.verseReference,
  },
  description: {
    ...typography.hint,
  },
});

export default PlaceholderScreen;
