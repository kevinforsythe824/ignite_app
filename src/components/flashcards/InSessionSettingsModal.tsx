import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '../../constants/spacing';
import { colors, radius, shadows, typography } from '../../constants/theme';

export interface InSessionSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  style?: StyleProp<ViewStyle>;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
/** Vertical drag distance that commits a dismiss instead of snapping back. */
const DISMISS_DISTANCE = 96;
/** Downward velocity (px/s) that commits a dismiss. */
const DISMISS_VELOCITY = 900;
const DISMISS_DURATION = 200;
/** Pan activates after a clear downward move so taps on sheet content still work. */
const PAN_ACTIVATION_DISTANCE = 8;

/**
 * In-session settings sheet shell. Controls will be wired in a follow-up.
 * Dismiss by dragging the sheet down or tapping the backdrop.
 */
export const InSessionSettingsModal: React.FC<InSessionSettingsModalProps> = ({
  visible,
  onClose,
  style,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const dragStartY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = SCREEN_HEIGHT;
      translateY.value = withTiming(0, {
        duration: DISMISS_DURATION,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [visible, translateY]);

  const dismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const animateClosed = useCallback(() => {
    translateY.value = withTiming(
      SCREEN_HEIGHT,
      { duration: DISMISS_DURATION, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished === true) {
          runOnJS(dismiss)();
        }
      },
    );
  }, [dismiss, translateY]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(PAN_ACTIVATION_DISTANCE)
        .onStart(() => {
          dragStartY.value = translateY.value;
        })
        .onUpdate((event) => {
          // Only allow dragging down — upward motion is clamped.
          translateY.value = Math.max(0, dragStartY.value + event.translationY);
        })
        .onEnd((event) => {
          const shouldDismiss =
            translateY.value > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY;

          if (shouldDismiss) {
            translateY.value = withTiming(
              SCREEN_HEIGHT,
              { duration: DISMISS_DURATION, easing: Easing.out(Easing.cubic) },
              (finished) => {
                if (finished === true) {
                  runOnJS(dismiss)();
                }
              },
            );
            return;
          }

          translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
        }),
    [dismiss, dragStartY, translateY],
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, SCREEN_HEIGHT * 0.45],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={animateClosed}
      accessibilityViewIsModal
    >
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.backdrop}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdropFill, backdropStyle]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={animateClosed}
              accessibilityRole="button"
              accessibilityLabel="Dismiss session settings"
            />
          </Animated.View>

          <GestureDetector gesture={gesture}>
            <Animated.View
              style={[
                styles.sheet,
                { paddingBottom: Math.max(insets.bottom, spacing.lg) },
                style,
                sheetStyle,
              ]}
              accessibilityLabel="Session settings sheet. Swipe down to dismiss."
            >
              <View style={styles.handle} />

              <View style={styles.header}>
                <Text style={styles.title} accessibilityRole="header">
                  Session Settings
                </Text>
              </View>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropFill: {
    backgroundColor: 'rgba(10, 37, 64, 0.35)',
  },
  sheet: {
    backgroundColor: colors.cardWhite,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.sm,
    minHeight: 220,
    ...shadows.card,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...typography.title,
    flex: 1,
  },
});

export default InSessionSettingsModal;
