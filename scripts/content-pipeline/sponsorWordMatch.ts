import type { ResolvedAnnotationSpan } from './types';

/**
 * Official-source word targeting primitives.
 *
 * The shared annotation matcher (`resolveAnnotationTarget`) is exact and
 * case-sensitive. Official frequency words are lowercase while the verse is
 * capitalized, so this module locates the WHOLE word in the actual verse while
 * allowing case and apostrophe-style differences, then hands the exact original
 * verse characters back to the shared matcher. It never rewrites the verse and
 * never relies on JavaScript's `\b`, which would treat an apostrophe or hyphen
 * as a boundary and split words such as "lord's" or "joint-heirs".
 */

/**
 * Apostrophe glyphs that the sponsor corpus treats as the same letter-internal
 * apostrophe: ASCII `'`, the right single quotation mark `’`, and the modifier
 * letter apostrophe `ʼ`. Normalisation maps one code point to one code point so
 * string indices stay aligned with the original verse.
 */
const APOSTROPHE_VARIANTS = /[\u2019\u02bc]/g;

export function normalizeApostrophes(value: string): string {
  return value.replace(APOSTROPHE_VARIANTS, "'");
}

/**
 * True when `ch` continues a lexical word, so a boundary exists only where the
 * neighbouring character is none of these (or the string edge). Letters, marks,
 * and decimal digits continue a word; so do an in-word apostrophe and the
 * hyphen-minus, which keeps "he" from matching inside "the" and keeps "heirs"
 * from matching inside "joint-heirs".
 */
export function isWordContinuationChar(ch: string | undefined): boolean {
  if (ch === undefined) {
    return false;
  }
  if (ch === "'" || ch === '\u2019' || ch === '\u02bc' || ch === '-') {
    return true;
  }
  return /[\p{L}\p{N}\p{M}]/u.test(ch);
}

function isAlphanumeric(ch: string | undefined): boolean {
  return ch !== undefined && /[\p{L}\p{N}]/u.test(ch);
}

/** Count of leading characters that are not alphanumeric (e.g. a leading `(`). */
export function leadingPunctuationLength(value: string): number {
  let index = 0;
  while (index < value.length && !isAlphanumeric(value[index])) {
    index += 1;
  }
  return index;
}

/** Count of trailing characters that are not alphanumeric (e.g. `.`, `"`, `)`). */
export function trailingPunctuationLength(value: string): number {
  let end = value.length;
  while (end > 0 && !isAlphanumeric(value[end - 1])) {
    end -= 1;
  }
  return value.length - end;
}

/**
 * Case-insensitive, apostrophe-normalised, whole-word occurrences of `word` in
 * `verseText`, in source order. Returned spans index into `verseText` so a slice
 * yields the ACTUAL original characters (preserving case and apostrophe glyph).
 *
 * Normalisation and lower-casing are length-preserving for the official corpus;
 * callers still re-derive the exact phrase and occurrence index from the
 * original verse and fail closed if a span does not round-trip.
 */
export function findWholeWordOccurrences(
  verseText: string,
  word: string,
): ResolvedAnnotationSpan[] {
  const haystack = normalizeApostrophes(verseText).toLowerCase();
  const needle = normalizeApostrophes(word).toLowerCase();
  const matches: ResolvedAnnotationSpan[] = [];
  if (needle.length === 0 || haystack.length !== verseText.length) {
    return matches;
  }

  let from = 0;
  while (from <= haystack.length - needle.length) {
    const start = haystack.indexOf(needle, from);
    if (start === -1) {
      break;
    }
    const end = start + needle.length;
    const before = start > 0 ? haystack[start - 1] : undefined;
    const after = end < haystack.length ? haystack[end] : undefined;
    if (!isWordContinuationChar(before) && !isWordContinuationChar(after)) {
      matches.push({ start, end });
    }
    from = start + 1;
  }
  return matches;
}
