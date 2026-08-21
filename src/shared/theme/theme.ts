import { TextStyle, ViewStyle } from 'react-native';

import { fonts } from './fonts';

export const colors = {
  navy: '#0A2540',
  accentRed: '#E85D4A',
  background: '#F5F5F7',
  /** Warm off-white for authentication / brand entry surfaces. */
  brandWarmBackground: '#F7F3EE',
  cardWhite: '#FFFFFF',
  borderLight: '#E5E7EB',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  keyword1x: '#3B82F6',
  keyword2x: '#15803D',
  keyword3x: '#EA580C',
  highlightYellow: '#FEF08A',
  markUnique: '#111827',
  markQuestion: '#C81E1E',
  markExclamation: '#1D4ED8',
  masteredGreen: '#22C55E',
  masteredGreenBg: '#DCFCE7',
  practicingRed: '#EF4444',
  practicingRedBg: '#FEE2E2',
  progressGradientStart: '#F97316',
  progressGradientEnd: '#FACC15',
} as const;

export const typography = {
  brandWordmark: {
    fontFamily: fonts.extraBold,
    fontSize: 28,
    fontWeight: '800',
    color: colors.navy,
  } satisfies TextStyle,
  brandTagline: {
    fontFamily: fonts.medium,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 22,
  } satisfies TextStyle,
  valueTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
  } satisfies TextStyle,
  valueBody: {
    fontFamily: fonts.regular,
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 20,
  } satisfies TextStyle,
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy,
  } satisfies TextStyle,
  progressCounter: {
    fontFamily: fonts.medium,
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
  } satisfies TextStyle,
  verseBody: {
    fontFamily: fonts.regular,
    fontSize: 17,
    fontWeight: '400',
    color: colors.navy,
    lineHeight: 26,
  } satisfies TextStyle,
  verseReference: {
    fontFamily: fonts.bold,
    fontSize: 22,
    fontWeight: '700',
    color: colors.navy,
  } satisfies TextStyle,
  hint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
  } satisfies TextStyle,
  badgeCount: {
    fontFamily: fonts.medium,
    fontSize: 14,
    fontWeight: '600',
  } satisfies TextStyle,
  indexCode: {
    fontFamily: fonts.regular,
    fontSize: 13,
    fontWeight: '400',
    color: colors.textMuted,
  } satisfies TextStyle,
} as const;

export const radius = {
  card: 16,
  pill: 20,
  badge: 8,
  progress: 3,
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  } satisfies ViewStyle,
} as const;

export const theme = {
  colors,
  fonts,
  typography,
  radius,
  shadows,
} as const;

export type Theme = typeof theme;
