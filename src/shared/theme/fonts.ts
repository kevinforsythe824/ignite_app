/**
 * Central Ignite typeface. Load matching faces via useIgniteFonts before rendering UI.
 * Prefer these tokens over scattering fontFamily literals in screens.
 */
export const fonts = {
  regular: 'NunitoSans_400Regular',
  medium: 'NunitoSans_500Medium',
  bold: 'NunitoSans_700Bold',
  extraBold: 'NunitoSans_800ExtraBold',
} as const;

export type FontToken = (typeof fonts)[keyof typeof fonts];
