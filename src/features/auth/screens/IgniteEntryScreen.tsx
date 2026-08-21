import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../../shared/theme';
import { IgniteBrandMark } from '../components/IgniteBrandMark';
import {
  AUTH_ENTRY_ANIMATION_DURATION_MS,
  AUTH_ENTRY_SCALE_END,
  AUTH_ENTRY_SCALE_START,
} from '../components/authLayout';
import { useReducedMotion } from '../hooks/useReducedMotion';

/**
 * Branded cover while authentication is initializing.
 * Closest visual match to the native splash. Does not delay routing;
 * unmounts as soon as the session resolves.
 */
export function IgniteEntryScreen(): React.JSX.Element {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
      return;
    }

    progress.value = withTiming(1, {
      duration: AUTH_ENTRY_ANIMATION_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        scale:
          AUTH_ENTRY_SCALE_START +
          progress.value * (AUTH_ENTRY_SCALE_END - AUTH_ENTRY_SCALE_START),
      },
    ],
  }));

  const brand = <IgniteBrandMark size="entry" />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.center}>
        {reducedMotion ? (
          brand
        ) : (
          <Animated.View style={animatedStyle}>{brand}</Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.brandWarmBackground,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
