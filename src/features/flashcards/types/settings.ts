/**
 * Which face of the flashcard is shown first after a flip reset.
 * - `locate` — full verse text first (user locates the reference)
 * - `quote` — reference first (user quotes the verse)
 */
export type CardSide = 'locate' | 'quote';

/** Structural category filters available in Active Flashcard Settings. */
export type CategoryFilterId =
  | 'uniqueBeginning'
  | 'uniqueEnding'
  | 'question'
  | 'exclamation';

export interface CategoryFilterOption {
  id: CategoryFilterId;
  label: string;
}

export const CATEGORY_FILTER_OPTIONS: readonly CategoryFilterOption[] = [
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
  playAudio: boolean;
  defaultSide: CardSide;
  /**
   * Selected structural filters. Empty means no filter (full deck).
   * When non-empty, a verse is included if it matches any selected filter.
   */
  categoryFilters: CategoryFilterId[];
}

export const DEFAULT_FLASHCARD_SETTINGS: FlashcardSettings = {
  shuffleCards: false,
  playAudio: false,
  // Verse text first — matches the prior default face (now named Locate).
  defaultSide: 'locate',
  categoryFilters: [],
};
