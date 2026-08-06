import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, radius } from '../../constants/theme';

export interface ProgressBarProps {
  /** Completion ratio between 0 and 1. Values outside the range are clamped. */
  progress: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_HEIGHT = 6;
const ANIMATION_DURATION = 350;

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = DEFAULT_HEIGHT,
  style,
}) => {
  const fill = useSharedValue(clamp(progress));

  useEffect(() => {
    fill.value = withTiming(clamp(progress), {
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [fill, progress]);

  const animatedFillStyle = useAnimatedStyle(() => {
    const width: DimensionValue = `${fill.value * 100}%`;
    return { width };
  });

  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2 }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamp(progress) * 100) }}
    >
      <Animated.View style={[styles.fill, animatedFillStyle]}>
        <LinearGradient
          colors={[colors.progressGradientStart, colors.progressGradientEnd]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.borderLight,
    borderRadius: radius.progress,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
});

export default ProgressBar;
