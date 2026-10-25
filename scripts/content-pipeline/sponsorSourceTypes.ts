import type { ValidationIssue } from './types';

/** Sponsor Verse List sheet name. Matched exactly. */
export const SPONSOR_VERSE_LIST_SHEET = 'Verse List';

/**
 * Sponsor Verse List headers. The reader maps by these names.
 * Column position in the workbook is not significant.
 */
export const SPONSOR_VERSE_LIST_COLUMNS = [
  'Seq',
  'Section',
  'Battlefield',
  'Topic',
  'Question',
  'Reference',
  'Book',
  'Ch',
  'V',
  'Unique Beginning',
  'Unique Ending',
  'Verse Text',
] as const;

export type SponsorVerseListColumn = (typeof SPONSOR_VERSE_LIST_COLUMNS)[number];

/**
 * Battlefield is an integer in some sponsor workbooks and text in others.
 * The Excel value is preserved. A numeric string is not parsed into a number.
 */
export type SponsorBattlefield = string | number;

/**
 * One Verse List card row.
 * Tooling source data only. This is not AuthoringWorkbookData and not a content package card.
 * Blank optional cells are omitted. They are not filled down from the previous row.
 * Unique beginning and unique ending are the raw sponsor strings, not annotation spans.
 */
export interface SponsorVerseListRow {
  /** 1-based Excel row number on the Verse List sheet. */
  readonly sourceRow: number;
  readonly seq: number;
  readonly section: string;
  readonly battlefield?: SponsorBattlefield;
  readonly topic?: string;
  readonly question?: string;
  /** Exact sponsor reference. */
  readonly reference: string;
  readonly book?: string;
  readonly ch?: number;
  readonly v?: number;
  /** Raw Unique Beginning cell. */
  readonly uniqueBeginning?: string;
  /** Raw Unique Ending cell. */
  readonly uniqueEnding?: string;
  /** Exact sponsor verse text. */
  readonly verseText: string;
}

/** Verse List rows from one sponsor workbook, in source order. */
export interface SponsorVerseList {
  readonly workbookName: string;
  readonly sheetName: typeof SPONSOR_VERSE_LIST_SHEET;
  readonly rows: readonly SponsorVerseListRow[];
  /** Section titles in first-seen source order. */
  readonly sections: readonly string[];
}

/**
 * Fail closed. An invalid workbook has errors and no verse list.
 */
export type SponsorVerseListResult =
  | { readonly ok: true; readonly verseList: SponsorVerseList }
  | { readonly ok: false; readonly errors: readonly ValidationIssue[] };
