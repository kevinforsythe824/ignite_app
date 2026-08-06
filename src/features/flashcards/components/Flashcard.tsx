import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Dimensions, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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

import { colors, radius, shadows, spacing } from '../../../shared/theme';
import type { Verse, VerseSegment } from '../types/verse';
import FlashcardBack from './FlashcardBack';
import FlashcardFront from './FlashcardFront';

export interface FlashcardProps {
  verse: Verse;
  /** Pre-parsed quote-side segments from the feature domain utils. */
  segments: VerseSegment[];
  /** Swipe right — card answered correctly. */
  onSwipeMastered: () => void;
  /** Swipe left — card needs more practice. */
  onSwipePracticing: () => void;
  style?: StyleProp<ViewStyle>;
}

type SwipeDirection = 'left' | 'right';

const SCREEN_WIDTH = Dimensions.get('window').width;
/** Horizontal distance that commits a swipe instead of snapping back. */
const SWIPE_THRESHOLD = 120;
/** Pan must beat this before it steals the gesture from the flip tap. */
const PAN_ACTIVATION_DISTANCE = 10;
const FLIP_DURATION = 400;
const FLY_OFF_DURATION = 220;
const FADE_IN_DURATION = 220;
const MAX_TILT_DEGREES = 8;
const MAX_OVERLAY_OPACITY = 0.28;
const CHROME_ICON_SIZE = 22;

export const Flashcard: React.FC<FlashcardProps> = React.memo(({
  verse,
  segments,
  onSwipeMastered,
  onSwipePracticing,
  style,
}) => {
  const rotation = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardOpacity = useSharedValue(1);

  const commitSwipe = useCallback(
    (direction: SwipeDirection) => {
      if (direction === 'right') {
        onSwipeMastered();
      } else {
        onSwipePracticing();
      }
    },
    [onSwipeMastered, onSwipePracticing],
  );

  // A new verse means the previous card already flew off screen: recentre it,
  // reset to the quote side, and fade the incoming card in.
  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    rotation.value = 0;
    cardOpacity.value = withTiming(1, { duration: FADE_IN_DURATION });
  }, [verse.id, cardOpacity, rotation, translateX, translateY]);

  // A tap only wins while the finger stays inside the pan's activation radius,
  // so a short press flips and anything more horizontal becomes a swipe.
  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDistance(PAN_ACTIVATION_DISTANCE)
      .onEnd(() => {
        const isShowingQuote = rotation.value < 90;
        rotation.value = withTiming(isShowingQuote ? 180 : 0, {
          duration: FLIP_DURATION,
          easing: Easing.inOut(Easing.cubic),
        });
      });

    const pan = Gesture.Pan()
      .activeOffsetX([-PAN_ACTIVATION_DISTANCE, PAN_ACTIVATION_DISTANCE])
      .onUpdate((event) => {
        translateX.value = event.translationX;
        translateY.value = event.translationY * 0.15;
      })
      .onEnd(() => {
        if (Math.abs(translateX.value) < SWIPE_THRESHOLD) {
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
          return;
        }

        const direction: SwipeDirection = translateX.value > 0 ? 'right' : 'left';
        const target = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;

        translateX.value = withTiming(
          target,
          { duration: FLY_OFF_DURATION, easing: Easing.out(Easing.quad) },
          (finished) => {
            if (finished === true) {
              cardOpacity.value = 0;
              runOnJS(commitSwipe)(direction);
            }
          },
        );
      });

    return Gesture.Exclusive(pan, tap);
  }, [commitSwipe, cardOpacity, rotation, translateX, translateY]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      {
        rotateZ: `${interpolate(
          translateX.value,
          [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
          [-MAX_TILT_DEGREES, 0, MAX_TILT_DEGREES],
          Extrapolation.CLAMP,
        )}deg`,
      },
    ],
  }));

  const quoteFaceStyle = useAnimatedStyle(() => ({
    opacity: rotation.value < 90 ? 1 : 0,
    transform: [{ perspective: 1000 }, { rotateY: `${rotation.value}deg` }],
  }));

  const locateFaceStyle = useAnimatedStyle(() => ({
    opacity: rotation.value < 90 ? 0 : 1,
    transform: [{ perspective: 1000 }, { rotateY: `${rotation.value + 180}deg` }],
  }));

  const masteredOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, MAX_OVERLAY_OPACITY],
      Extrapolation.CLAMP,
    ),
  }));

  const practicingOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [MAX_OVERLAY_OPACITY, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.container, style, containerStyle]}>
        <Animated.View style={[styles.face, quoteFaceStyle]}>
          <CardChrome />
          <FlashcardBack segments={segments} indexCode={verse.index_code} />
        </Animated.View>

        <Animated.View style={[styles.face, locateFaceStyle]}>
          <CardChrome />
          <FlashcardFront verse={verse} />
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[styles.overlay, styles.masteredOverlay, masteredOverlayStyle]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.overlay, styles.practicingOverlay, practicingOverlayStyle]}
        />
      </Animated.View>
    </GestureDetector>
  );
});

/** Speaker / favourite affordances — visual only until Sprint 1.5. */
const CardChrome = React.memo(function CardChrome() {
  return (
    <View style={styles.chromeRow}>
      <Ionicons name="volume-high" size={CHROME_ICON_SIZE} color={colors.accentRed} />
      <Ionicons name="star-outline" size={CHROME_ICON_SIZE} color={colors.accentRed} />
    </View>
  );
});

const ABSOLUTE_FILL = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
} as const satisfies ViewStyle;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  face: {
    ...ABSOLUTE_FILL,
    backgroundColor: colors.cardWhite,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    backfaceVisibility: 'hidden',
    ...shadows.card,
  },
  chromeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overlay: {
    ...ABSOLUTE_FILL,
    borderRadius: radius.card,
  },
  masteredOverlay: {
    backgroundColor: colors.masteredGreen,
  },
  practicingOverlay: {
    backgroundColor: colors.practicingRed,
  },
});

export default Flashcard;
