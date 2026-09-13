import { TextStyle, ViewStyle } from 'react-native';

import { fonts } from './fonts';

export const colors = {
  navy: '#0A2540',
  accentRed: '#E85D4A',
  background: '#F5F5F7',
  /**
   * @deprecated Legacy temporary flat warm canvas for Auth/entry/consent/loading covers.
   * Not the Auth Brand Mode target — migrate to `authBackgroundStart` / `authBackgroundEnd`.
   * Keep until Auth Brand consumers migrate; remove only after audit (Batch 8+).
   */
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
  // --- Semantic roles (Batch 0) — independent literals; not aliases of domain keys ---
  surface: '#FFFFFF',
  textPrimary: '#0A2540',
  accent: '#E85D4A',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  success: '#22C55E',
  successSoft: '#DCFCE7',
  border: '#E5E7EB',
  disabledBackground: '#E5E7EB',
  disabledText: '#9CA3AF',
  // --- Auth Brand Mode (additive) — not Main Product canvas/accent ---
  /** Auth Brand Mode gradient top (light warm blush/peach). */
  authBackgroundStart: '#FFF5F0',
  /** Auth Brand Mode gradient bottom (soft near-white warm-neutral). */
  authBackgroundEnd: '#FFFBFA',
  /** Auth Brand Mode accent for primary CTAs / emphasis links (white-on-accent ≈ 4.50:1). */
  authAccent: '#D04925',
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
  // --- Semantic type roles (Batch 0) — additive; do not reuse verseReference for titles ---
  screenTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 34,
  } satisfies TextStyle,
  stackTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 24,
  } satisfies TextStyle,
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 24,
  } satisfies TextStyle,
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 22,
  } satisfies TextStyle,
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    fontWeight: '400',
    color: colors.textPrimary,
    lineHeight: 24,
  } satisfies TextStyle,
  bodySecondary: {
    fontFamily: fonts.regular,
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 20,
  } satisfies TextStyle,
  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 18,
  } satisfies TextStyle,
  action: {
    fontFamily: fonts.bold,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 22,
  } satisfies TextStyle,
  input: {
    fontFamily: fonts.regular,
    fontSize: 16,
    fontWeight: '400',
    color: colors.textPrimary,
    lineHeight: 22,
  } satisfies TextStyle,
  helper: {
    fontFamily: fonts.regular,
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 18,
  } satisfies TextStyle,
  error: {
    fontFamily: fonts.regular,
    fontSize: 13,
    fontWeight: '400',
    color: colors.danger,
    lineHeight: 18,
  } satisfies TextStyle,
} as const;

export const radius = {
  card: 16,
  pill: 20,
  badge: 8,
  progress: 3,
  /** Semantic control radius (inputs, compact chrome); independent of legacy `badge`. */
  control: 8,
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
