import type { ScripturePresentationMode } from '../scripturePresentation';

/**
 * Which face of the flashcard is shown first after a flip reset.
 * - `locate` — full verse text first (user locates the reference)
 * - `quote` — reference first (user quotes the verse)
 */
export type CardSide = 'locate' | 'quote';

/**
 * Category filters available in flashcard settings.
 * Legacy options mirror the Index Legend. Official options are the annotation
 * types the sponsor workbooks store: unique phrases and frequency tiers 1–5.
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
  | 'exclamation'
  | 'frequency1x'
  | 'frequency2x'
  | 'frequency3x'
  | 'frequency4x'
  | 'frequency5x';

export interface CategoryFilterOption {
  id: CategoryFilterId;
  label: string;
  /** Spoken name when the visible label is abbreviated. */
  accessibilityLabel?: string;
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
 * Official 2027 filters. Frequency tiers are not the legacy keyword categories.
 * Animals, names, body parts, places, questions, and exclamations are omitted:
 * the sponsor workbooks do not store those as tags or annotation types.
 */
export const OFFICIAL_CATEGORY_FILTER_OPTIONS: readonly CategoryFilterOption[] = [
  { id: 'uniqueBeginning', label: 'Unique Beg.', accessibilityLabel: 'Unique Beginning' },
  { id: 'uniqueEnding', label: 'Unique End.', accessibilityLabel: 'Unique Ending' },
  { id: 'frequency1x', label: '1x Frequency' },
  { id: 'frequency2x', label: '2x Frequency' },
  { id: 'frequency3x', label: '3x Frequency' },
  { id: 'frequency4x', label: '4x Frequency' },
  { id: 'frequency5x', label: '5x Frequency' },
] as const;

/** Official frequency filter id → tier. Legacy keyword ids are not in this map. */
export const OFFICIAL_FREQUENCY_FILTER_TIER = {
  frequency1x: 1,
  frequency2x: 2,
  frequency3x: 3,
  frequency4x: 4,
  frequency5x: 5,
} as const;

export type OfficialFrequencyFilterId = keyof typeof OFFICIAL_FREQUENCY_FILTER_TIER;

const LEGACY_CATEGORY_FILTER_IDS: ReadonlySet<CategoryFilterId> = new Set(
  CATEGORY_FILTER_OPTIONS.map((option) => option.id),
);
const OFFICIAL_CATEGORY_FILTER_IDS: ReadonlySet<CategoryFilterId> = new Set(
  OFFICIAL_CATEGORY_FILTER_OPTIONS.map((option) => option.id),
);

export function categoryFilterOptionsFor(
  presentation: ScripturePresentationMode,
): readonly CategoryFilterOption[] {
  return presentation === 'official' ? OFFICIAL_CATEGORY_FILTER_OPTIONS : CATEGORY_FILTER_OPTIONS;
}

/**
 * Drops filter ids the active presentation does not offer.
 * A leftover legacy keyword id must not stay selected in official mode and
 * empty the deck, and the reverse is true for frequency ids.
 */
export function categoryFiltersForPresentation(
  filters: readonly CategoryFilterId[],
  presentation: ScripturePresentationMode,
): CategoryFilterId[] {
  const allowed =
    presentation === 'official' ? OFFICIAL_CATEGORY_FILTER_IDS : LEGACY_CATEGORY_FILTER_IDS;
  return filters.filter((filterId) => allowed.has(filterId));
}

export function isOfficialFrequencyFilterId(
  filterId: CategoryFilterId,
): filterId is OfficialFrequencyFilterId {
  return Object.prototype.hasOwnProperty.call(OFFICIAL_FREQUENCY_FILTER_TIER, filterId);
}

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
