export const spacing = {
  screenPaddingH: 20,
  cardPadding: 24,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  // --- Semantic aliases (Batch 0) ---
  sectionGap: 24,
  formFieldGap: 16,
  rowGap: 12,
  minTouchTarget: 44,
} as const;

export type Spacing = typeof spacing;
