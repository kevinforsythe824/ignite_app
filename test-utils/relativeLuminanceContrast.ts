/**
 * WCAG 2 contrast from sRGB hex. No dependencies.
 * Linearize each channel: srgb = channel / 255;
 * if srgb <= 0.04045 then srgb / 12.92 else ((srgb + 0.055) / 1.055) ^ 2.4.
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B.
 * ratio = (Llighter + 0.05) / (Ldarker + 0.05).
 */

export interface SrgbChannels {
  r: number;
  g: number;
  b: number;
}

export function parseSrgbHex(hex: string): SrgbChannels {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (match === null) {
    throw new Error(`Expected a 6-digit sRGB hex color, received "${hex}"`);
  }
  const value = match[1] ?? '';
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

export function linearizeSrgbChannel(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseSrgbHex(hex);
  return (
    0.2126 * linearizeSrgbChannel(r) +
    0.7152 * linearizeSrgbChannel(g) +
    0.0722 * linearizeSrgbChannel(b)
  );
}

export function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}
