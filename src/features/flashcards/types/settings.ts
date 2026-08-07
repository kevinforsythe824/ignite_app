/**
 * Which face of the flashcard is shown first after a flip reset.
 * - `locate` — full verse text first (user locates the reference)
 * - `quote` — reference first (user quotes the verse)
 */
export type CardSide = 'locate' | 'quote';

/**
 * Category filters available in Active Flashcard Settings.
 * Mirrors Index Legend: keyword tiers → semantic tags → structural markers.
 */
export type CategoryFilterId =
  | 'keyword1x'
  | 'keyword2x'
  | 'keyword3x'
  | 'animals'
  | 'properName'
  | 'bodyParts'
  | 'geoLocation'
  | 'uniqueBeginning'
  | 'uniqueEnding'
  | 'question'
  | 'exclamation';

export interface CategoryFilterOption {
  id: CategoryFilterId;
  label: string;
}

/** Ordered to match Index Legend grouping for a natural scan. */
export const CATEGORY_FILTER_OPTIONS: readonly CategoryFilterOption[] = [
  { id: 'keyword1x', label: '1x Keyword' },
  { id: 'keyword2x', label: '2x Keyword' },
  { id: 'keyword3x', label: '3x Keyword' },
  { id: 'animals', label: 'Animals' },
  { id: 'properName', label: 'Proper Name' },
  { id: 'bodyParts', label: 'Body Parts' },
  { id: 'geoLocation', label: 'Geo Location' },
  { id: 'uniqueBeginning', label: 'Unique Beg.' },
  { id: 'uniqueEnding', label: 'Unique End.' },
  { id: 'question', label: 'Questions' },
  { id: 'exclamation', label: 'Exclamations' },
] as const;

/**
 * In-session study preferences. Independent of mastery progress so toggles
 * can change without wiping answered cards (except explicit Restart).
 */
export interface FlashcardSettings {
  shuffleCards: boolean;
  defaultSide: CardSide;
  /**
   * Selected category filters. Empty means no filter (full deck).
   * When non-empty, a verse is included if it matches any selected filter.
   */
  categoryFilters: CategoryFilterId[];
}

export const DEFAULT_FLASHCARD_SETTINGS: FlashcardSettings = {
  shuffleCards: false,
  // Verse text first — matches the prior default face (now named Locate).
  defaultSide: 'locate',
  categoryFilters: [],
};
