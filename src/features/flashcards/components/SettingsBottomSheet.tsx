import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, shadows, spacing } from '../../../shared/theme';

export interface SettingsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;
const BACKDROP_OPACITY = 0.45;
const BACKDROP_FADE_IN_MS = 280;
const BACKDROP_FADE_OUT_MS = 220;
const CLOSE_DURATION_MS = 280;

/** Soft spring — settles without a stiff snap at the end. */
const SHEET_SPRING = {
  damping: 28,
  stiffness: 220,
  mass: 0.92,
  overshootClamping: false,
} as const;

const BACKDROP_EASE_IN = Easing.out(Easing.cubic);
const BACKDROP_EASE_OUT = Easing.in(Easing.cubic);
const CLOSE_EASE = Easing.bezier(0.4, 0, 0.2, 1);

/**
 * Animated bottom sheet shell. Stays mounted through the close animation so
 * dismiss is a smooth slide-down rather than an abrupt unmount.
 */
export function SettingsBottomSheet({
  visible,
  onClose,
  children,
  style,
}: SettingsBottomSheetProps): React.JSX.Element | null {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);

  const finishClose = useCallback(() => {
    setMounted(false);
  }, []);

  // Mount first, then animate on the next effect pass so open doesn't restart
  // when `mounted` flips (which made the sheet feel snappy).
  useEffect(() => {
    if (visible) {
      setMounted(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    if (visible) {
      translateY.value = withSpring(0, SHEET_SPRING);
      backdropOpacity.value = withTiming(BACKDROP_OPACITY, {
        duration: BACKDROP_FADE_IN_MS,
        easing: BACKDROP_EASE_IN,
      });
      return;
    }

    translateY.value = withTiming(
      SCREEN_HEIGHT,
      {
        duration: CLOSE_DURATION_MS,
        easing: CLOSE_EASE,
      },
      (finished) => {
        if (finished === true) {
          runOnJS(finishClose)();
        }
      },
    );
    backdropOpacity.value = withTiming(0, {
      duration: BACKDROP_FADE_OUT_MS,
      easing: BACKDROP_EASE_OUT,
    });
  }, [visible, mounted, translateY, backdropOpacity, finishClose]);

  const requestClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY) {
        runOnJS(requestClose)();
        return;
      }
      translateY.value = withSpring(0, SHEET_SPRING);
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!mounted) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      statusBarTranslucent
      onRequestClose={requestClose}
    >
      <View style={styles.root} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss settings"
          onPress={requestClose}
          style={StyleSheet.absoluteFill}
        >
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
            style,
            sheetStyle,
          ]}
        >
          <GestureDetector gesture={panGesture}>
            <View style={styles.handleHitArea} accessibilityElementsHidden>
              <View style={styles.handle} />
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
  },
  sheet: {
    backgroundColor: colors.cardWhite,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.sm,
    maxHeight: SCREEN_HEIGHT * 0.88,
    ...shadows.card,
  },
  handleHitArea: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
  },
});

export default SettingsBottomSheet;
