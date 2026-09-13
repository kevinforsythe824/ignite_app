import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import ProgressBar from './ProgressBar';
import ScorePill from './ScorePill';

export interface StudyHeaderProps {
  title: string;
  /** 1-based position of the card being studied. */
  current: number;
  total: number;
  correctCount: number;
  needsWorkCount: number;
  /** Completion ratio between 0 and 1. */
  progress: number;
  onBackPress?: () => void;
  onSettingsPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const ICON_SIZE = 24;

export const StudyHeader: React.FC<StudyHeaderProps> = React.memo(({
  title,
  current,
  total,
  correctCount,
  needsWorkCount,
  progress,
  onBackPress,
  onSettingsPress,
  style,
}) => (
  <View style={[styles.container, style]}>
    <View style={styles.navRow}>
      {onBackPress ? (
        <Pressable
          onPress={onBackPress}
          hitSlop={spacing.sm}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={ICON_SIZE} color={colors.navy} />
        </Pressable>
      ) : (
        <View style={styles.iconButton} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      )}

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <Pressable
        onPress={onSettingsPress}
        hitSlop={spacing.sm}
        accessibilityRole="button"
        accessibilityLabel="Study settings"
        style={styles.iconButton}
      >
        <Ionicons name="settings-outline" size={ICON_SIZE} color={colors.navy} />
      </Pressable>
    </View>

    <Text style={styles.counter}>{`${current}/${total}`}</Text>

    <ProgressBar progress={progress} style={styles.progressBar} />

    <View style={styles.pillRow}>
      <ScorePill variant="needsWork" count={needsWorkCount} />
      <ScorePill variant="correct" count={correctCount} />
    </View>
  </View>
));

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.sm,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    minWidth: spacing.minTouchTarget,
    minHeight: spacing.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.title,
    flex: 1,
    textAlign: 'center',
  },
  counter: {
    ...typography.progressCounter,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  progressBar: {
    marginTop: spacing.md,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
});

export default StudyHeader;
