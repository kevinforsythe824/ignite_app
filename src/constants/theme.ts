import { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  navy: '#0A2540',
  accentRed: '#E85D4A',
  background: '#F5F5F7',
  cardWhite: '#FFFFFF',
  borderLight: '#E5E7EB',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  keyword1x: '#3B82F6',
  keyword2x: '#15803D',
  keyword3x: '#EA580C',
  highlightYellow: '#FEF08A',
  masteredGreen: '#22C55E',
  masteredGreenBg: '#DCFCE7',
  practicingRed: '#EF4444',
  practicingRedBg: '#FEE2E2',
  progressGradientStart: '#F97316',
  progressGradientEnd: '#FACC15',
} as const;

export const typography = {
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy,
  } satisfies TextStyle,
  progressCounter: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
  } satisfies TextStyle,
  verseBody: {
    fontSize: 17,
    fontWeight: '400',
    color: colors.navy,
    lineHeight: 26,
  } satisfies TextStyle,
  verseReference: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.navy,
  } satisfies TextStyle,
  hint: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
  } satisfies TextStyle,
  badgeCount: {
    fontSize: 14,
    fontWeight: '600',
  } satisfies TextStyle,
  indexCode: {
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
  typography,
  radius,
  shadows,
} as const;

export type Theme = typeof theme;
