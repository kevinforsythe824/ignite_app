import React from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Outline undo hook traced from the Previous reference:
 * left-pointing chevron, shaft to the right, semicircle down,
 * shorter tail returning underneath (open on the left).
 * Stroke only — no fill, circle, or label.
 *
 * react-native-svg is not a project dependency, so the stroke is drawn locally.
 */

/** Shaft-interior pixel sampled from the reference stroke. */
export const PREVIOUS_ICON_ENABLED_COLOR = '#5C6479';

/** Displayed glyph box. The parent pressable keeps the 44px touch target. */
const PREVIOUS_ICON_SIZE = 18;
/** Hook coordinates are authored in a 26px box and scaled uniformly. */
const DRAW_SCALE = PREVIOUS_ICON_SIZE / 26;
const HOOK_STROKE = 2.8 * DRAW_SCALE;
const HOOK_TIP_X = 3.1 * DRAW_SCALE;
const HOOK_SHAFT_Y = 9.4 * DRAW_SCALE;
const HOOK_TAIL_Y = 22.6 * DRAW_SCALE;
const HOOK_CURVE_CX = 16.3 * DRAW_SCALE;
const HOOK_TAIL_END_X = 6.5 * DRAW_SCALE;
const HOOK_WING_END_X = 10.3 * DRAW_SCALE;
const HOOK_WING_RISE = 6.2 * DRAW_SCALE;
const ARC_STEPS = 24;
/** Overlap adjacent butts so the polyline reads as one round-joined stroke. */
const JOIN_EXTENSION = HOOK_STROKE * 0.18;

type Point = { x: number; y: number };

function buildHookPoints(): Point[] {
  const radius = (HOOK_TAIL_Y - HOOK_SHAFT_Y) / 2;
  const centerY = (HOOK_SHAFT_Y + HOOK_TAIL_Y) / 2;
  const points: Point[] = [{ x: HOOK_TIP_X, y: HOOK_SHAFT_Y }];
  for (let step = 0; step <= ARC_STEPS; step += 1) {
    const angle = -Math.PI / 2 + (Math.PI * step) / ARC_STEPS;
    points.push({
      x: HOOK_CURVE_CX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }
  points.push({ x: HOOK_TAIL_END_X, y: HOOK_TAIL_Y });
  return points;
}

const HOOK_POINTS = buildHookPoints();

const WING_ENDS: Point[] = [
  { x: HOOK_WING_END_X, y: HOOK_SHAFT_Y - HOOK_WING_RISE },
  { x: HOOK_WING_END_X, y: HOOK_SHAFT_Y + HOOK_WING_RISE },
];

export function PreviousCardIcon({ color }: { color: string }): React.JSX.Element {
  const tip = HOOK_POINTS[0];
  const tailEnd = HOOK_POINTS[HOOK_POINTS.length - 1];

  return (
    <View
      testID="previous-card-icon"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.icon}
    >
      {HOOK_POINTS.slice(0, -1).map((start, index) => (
        <Stroke
          key={`hook-${index}`}
          from={start}
          to={HOOK_POINTS[index + 1]}
          color={color}
        />
      ))}
      {WING_ENDS.map((end) => (
        <Stroke
          key={`wing-${end.y}`}
          from={tip}
          to={end}
          color={color}
        />
      ))}
      <RoundCap x={tip.x} y={tip.y} color={color} />
      <RoundCap x={tailEnd.x} y={tailEnd.y} color={color} />
      {WING_ENDS.map((end) => (
        <RoundCap key={`wing-cap-${end.y}`} x={end.x} y={end.y} color={color} />
      ))}
    </View>
  );
}

function Stroke({
  from,
  to,
  color,
}: {
  from: Point;
  to: Point;
  color: string;
}): React.JSX.Element {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const drawLength = length + JOIN_EXTENSION * 2;
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: midX - drawLength / 2,
        top: midY - HOOK_STROKE / 2,
        width: drawLength,
        height: HOOK_STROKE,
        backgroundColor: color,
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}

/** SVG-style round cap: semicircle centered on the path endpoint. */
function RoundCap({
  x,
  y,
  color,
}: {
  x: number;
  y: number;
  color: string;
}): React.JSX.Element {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - HOOK_STROKE / 2,
        top: y - HOOK_STROKE / 2,
        width: HOOK_STROKE,
        height: HOOK_STROKE,
        borderRadius: HOOK_STROKE / 2,
        backgroundColor: color,
      }}
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    width: PREVIOUS_ICON_SIZE,
    height: PREVIOUS_ICON_SIZE,
  },
});
