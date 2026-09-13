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
import type { Card } from '../domain/card';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { CardSide } from '../types/settings';
import type { VerseSegment } from '../types/verse';
import FlashcardBack from './FlashcardBack';
import FlashcardFront from './FlashcardFront';

export interface FlashcardProps {
  card: Card;
  /** Pre-parsed quote-side segments from the feature domain utils. */
  segments: VerseSegment[];
  /** Which face is shown when a new card arrives. */
  defaultSide?: CardSide;
  /** Swipe right — card answered correctly. */
  onSwipeCorrect: () => void;
  /** Swipe left — card needs more work. */
  onSwipeNeedsWork: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Locate = verse face (0°); Quote = reference face (180°). */
function rotationForSide(side: CardSide): number {
  return side === 'quote' ? 180 : 0;
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
  card,
  segments,
  defaultSide = 'locate',
  onSwipeCorrect,
  onSwipeNeedsWork,
  style,
}) => {
  const reducedMotion = useReducedMotion();
  const rotation = useSharedValue(rotationForSide(defaultSide));
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardOpacity = useSharedValue(1);

  const commitSwipe = useCallback(
    (direction: SwipeDirection) => {
      if (direction === 'right') {
        onSwipeCorrect();
      } else {
        onSwipeNeedsWork();
      }
    },
    [onSwipeCorrect, onSwipeNeedsWork],
  );

  // A new verse means the previous card already flew off screen: recentre it,
  // reset to the configured default side, and fade the incoming card in.
  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    rotation.value = rotationForSide(defaultSide);
    const fadeMs = reducedMotion ? 0 : FADE_IN_DURATION;
    cardOpacity.value = withTiming(1, { duration: fadeMs });
  }, [card.cardId, defaultSide, cardOpacity, reducedMotion, rotation, translateX, translateY]);

  // A tap only wins while the finger stays inside the pan's activation radius,
  // so a short press flips and anything more horizontal becomes a swipe.
  const gesture = useMemo(() => {
    const flipMs = reducedMotion ? 0 : FLIP_DURATION;
    const flyMs = reducedMotion ? 0 : FLY_OFF_DURATION;

    const tap = Gesture.Tap()
      .maxDistance(PAN_ACTIVATION_DISTANCE)
      .onEnd(() => {
        const isShowingLocate = rotation.value < 90;
        rotation.value = withTiming(isShowingLocate ? 180 : 0, {
          duration: flipMs,
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
          if (reducedMotion) {
            translateX.value = 0;
            translateY.value = 0;
          } else {
            translateX.value = withSpring(0);
            translateY.value = withSpring(0);
          }
          return;
        }

        const direction: SwipeDirection = translateX.value > 0 ? 'right' : 'left';
        const target = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;

        translateX.value = withTiming(
          target,
          { duration: flyMs, easing: Easing.out(Easing.quad) },
          (finished) => {
            if (finished === true) {
              cardOpacity.value = 0;
              runOnJS(commitSwipe)(direction);
            }
          },
        );
      });

    return Gesture.Exclusive(pan, tap);
  }, [commitSwipe, cardOpacity, reducedMotion, rotation, translateX, translateY]);

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

  // Locate face — full verse text (front at 0°).
  const locateFaceStyle = useAnimatedStyle(() => ({
    opacity: rotation.value < 90 ? 1 : 0,
    transform: [{ perspective: 1000 }, { rotateY: `${rotation.value}deg` }],
  }));

  // Quote face — reference only (back at 180°).
  const quoteFaceStyle = useAnimatedStyle(() => ({
    opacity: rotation.value < 90 ? 0 : 1,
    transform: [{ perspective: 1000 }, { rotateY: `${rotation.value + 180}deg` }],
  }));

  const correctOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, MAX_OVERLAY_OPACITY],
      Extrapolation.CLAMP,
    ),
  }));

  const needsWorkOverlayStyle = useAnimatedStyle(() => ({
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
        <Animated.View style={[styles.face, locateFaceStyle]}>
          <CardChrome />
          <FlashcardBack segments={segments} indexCode={card.indexCode} />
        </Animated.View>

        <Animated.View style={[styles.face, quoteFaceStyle]}>
          <CardChrome />
          <FlashcardFront card={card} />
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          importantForAccessibility="no"
          style={[styles.overlay, styles.correctOverlay, correctOverlayStyle]}
        />
        <Animated.View
          pointerEvents="none"
          importantForAccessibility="no"
          style={[styles.overlay, styles.needsWorkOverlay, needsWorkOverlayStyle]}
        />
      </Animated.View>
    </GestureDetector>
  );
});

/** Decorative chrome only — audio / favourite are not wired yet. */
const CardChrome = React.memo(function CardChrome() {
  return (
    <View
      style={styles.chromeRow}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
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
  correctOverlay: {
    backgroundColor: colors.masteredGreen,
  },
  needsWorkOverlay: {
    backgroundColor: colors.practicingRed,
  },
});

export default Flashcard;
