import type { ValidationIssue } from './types';

/** Sponsor frequency sheet name. Matched exactly. */
export const SPONSOR_FREQUENCY_SHEET = 'All Frequency Words';

/**
 * `All Frequency Words` headers. The reader maps by these names; column position
 * is not significant.
 */
export const SPONSOR_FREQUENCY_COLUMNS = [
  'Class',
  'Word',
  'Verses',
  'Occurrences',
  'Repeats In Verse',
  'References',
] as const;

export type SponsorFrequencyColumn = (typeof SPONSOR_FREQUENCY_COLUMNS)[number];

/** Cell value stored in `Repeats In Verse` when a word repeats inside a verse. */
export const SPONSOR_REPEATS_IN_VERSE_FLAG = 'YES';

/** Frequency tier range. The sheet's `Class` column is the tier. */
export const SPONSOR_FREQUENCY_MIN_TIER = 1;
export const SPONSOR_FREQUENCY_MAX_TIER = 5;

/** Reference separator observed in the sponsor workbooks: space, middle dot, space. */
export const SPONSOR_REFERENCE_SEPARATOR = ' \u00b7 ';

/**
 * One `All Frequency Words` row. Tooling source data only — not an annotation
 * and not a content-package record.
 *
 * `tier` is the `Class` cell (1–5), which the sponsor corpus keeps equal to the
 * distinct-verse count in `verses`. `occurrences` is the total number of
 * whole-word matches across the referenced verses and may exceed `verses` when
 * the word repeats inside a verse.
 */
export interface SponsorFrequencyEntry {
  /** 1-based Excel row number on the frequency sheet. */
  readonly sourceRow: number;
  readonly word: string;
  readonly tier: number;
  readonly verses: number;
  readonly occurrences: number;
  readonly repeatsInVerse: boolean;
  /** Exact sponsor reference strings, in source order, split on the middle-dot. */
  readonly references: readonly string[];
}

/** Verified frequency rows from one sponsor workbook, in source order. */
export interface SponsorFrequencyWords {
  readonly workbookName: string;
  readonly sheetName: typeof SPONSOR_FREQUENCY_SHEET;
  readonly entries: readonly SponsorFrequencyEntry[];
}

/** Fail closed. An invalid frequency sheet has errors and no entries. */
export type SponsorFrequencyWordsResult =
  | { readonly ok: true; readonly frequencyWords: SponsorFrequencyWords }
  | { readonly ok: false; readonly errors: readonly ValidationIssue[] };
