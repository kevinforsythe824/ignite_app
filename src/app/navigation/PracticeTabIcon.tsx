import React from 'react';
import { View } from 'react-native';

export type PracticeTabIconProps = {
  color: string;
  size: number;
};

/** 24-unit design space — same box Ionicons use at the shared tab size. */
const VIEW_BOX = 24;
/**
 * Optical match to Ionicons outline weight at ~24px.
 * (react-native-svg is not a project dependency; strokes are drawn locally.)
 */
const STROKE_WIDTH = 1.55;

/**
 * Tall thin-outline clipboard with two check + line rows.
 * Fills the shared tab icon size; callers must not apply a size bump.
 */
export function PracticeTabIcon({ color, size }: PracticeTabIconProps): React.JSX.Element {
  const scale = size / VIEW_BOX;
  const stroke = STROKE_WIDTH * scale;

  return (
    <View accessible={false} pointerEvents="none" style={{ width: size, height: size }}>
      <OutlineRect
        x={8.7}
        y={1.25}
        width={6.6}
        height={3.5}
        radius={1.15}
        color={color}
        scale={scale}
        stroke={stroke}
      />
      <OutlineRect
        x={4.2}
        y={3.15}
        width={15.6}
        height={19.1}
        radius={2.4}
        color={color}
        scale={scale}
        stroke={stroke}
      />
      <StrokeSegment x1={7.15} y1={9.15} x2={8.3} y2={10.4} color={color} scale={scale} stroke={stroke} />
      <StrokeSegment x1={8.3} y1={10.4} x2={10.5} y2={8.0} color={color} scale={scale} stroke={stroke} />
      <StrokeSegment x1={11.85} y1={9.4} x2={17.2} y2={9.4} color={color} scale={scale} stroke={stroke} />
      <StrokeSegment x1={7.15} y1={13.85} x2={8.3} y2={15.1} color={color} scale={scale} stroke={stroke} />
      <StrokeSegment x1={8.3} y1={15.1} x2={10.5} y2={12.7} color={color} scale={scale} stroke={stroke} />
      <StrokeSegment x1={11.85} y1={14.1} x2={17.2} y2={14.1} color={color} scale={scale} stroke={stroke} />
    </View>
  );
}

type OutlineRectProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  color: string;
  scale: number;
  stroke: number;
};

/** Rounded rect whose coordinates are SVG-style (stroke centered on the path). */
function OutlineRect({
  x,
  y,
  width,
  height,
  radius,
  color,
  scale,
  stroke,
}: OutlineRectProps): React.JSX.Element {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x * scale - stroke / 2,
        top: y * scale - stroke / 2,
        width: width * scale + stroke,
        height: height * scale + stroke,
        borderWidth: stroke,
        borderColor: color,
        borderRadius: radius * scale + stroke / 2,
        backgroundColor: 'transparent',
      }}
    />
  );
}

type StrokeSegmentProps = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  scale: number;
  stroke: number;
};

function StrokeSegment({
  x1,
  y1,
  x2,
  y2,
  color,
  scale,
  stroke,
}: StrokeSegmentProps): React.JSX.Element {
  const dx = (x2 - x1) * scale;
  const dy = (y2 - y1) * scale;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const cx = ((x1 + x2) / 2) * scale;
  const cy = ((y1 + y2) / 2) * scale;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: cx - length / 2,
        top: cy - stroke / 2,
        width: length,
        height: stroke,
        backgroundColor: color,
        borderRadius: stroke / 2,
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}
