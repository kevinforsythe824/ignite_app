import type { MatchedRule, SegmentType, Verse, VerseMark, VerseSegment } from '../types/verse';

type KeywordSegmentType = Extract<SegmentType, 'keyword1x' | 'keyword2x' | 'keyword3x'>;

interface KeywordRange {
  start: number;
  end: number;
  type: SegmentType;
}

interface MarkRange {
  start: number;
  end: number;
  mark: VerseMark;
}

const KEYWORD_RULES: Readonly<Record<string, KeywordSegmentType>> = {
  '1x keyword': 'keyword1x',
  '2x keyword': 'keyword2x',
  '3x keyword': 'keyword3x',
};

/** When the same word is tagged by several tiers, the highest tier wins. */
const KEYWORD_PRIORITY: Readonly<Record<KeywordSegmentType, number>> = {
  keyword1x: 1,
  keyword2x: 2,
  keyword3x: 3,
};

const MARK_RULES: Readonly<Record<string, VerseMark>> = {
  'unique beg': 'uniqueBeginning',
  'unique beginning': 'uniqueBeginning',
  'unique end': 'uniqueEnding',
  'unique ending': 'uniqueEnding',
  question: 'question',
  exclamation: 'exclamation',
};

/** Recitation slashes bracket the unique phrases; the other marks stand alone. */
const MARK_SLASHES: Readonly<Partial<Record<VerseMark, { glyph: string; side: 'before' | 'after' }>>> = {
  uniqueBeginning: { glyph: '/', side: 'after' },
  uniqueEnding: { glyph: '\\', side: 'before' },
};

const CLAUSE_TERMINATORS: Readonly<Partial<Record<VerseMark, string>>> = {
  question: '?',
  exclamation: '!',
};

const QUOTED_WORD_PATTERN = /'([^']+)'/g;
const CLAUSE_PATTERN = /[^.!?]*[!?]/g;
const EDGE_PUNCTUATION_PATTERN = /^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g;
const WORD_CHARACTER_PATTERN = /[A-Za-z0-9_]/;
const SLASH_PATTERN = '[/\\\\]';
const OPENING_PUNCTUATION = new Set(['(', '[', '"', "'", '\u201C', '\u2018']);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripEdgePunctuation(value: string): string {
  return value.replace(EDGE_PUNCTUATION_PATTERN, '');
}

/**
 * Keyword rules list their words inside single quotes, e.g.
 * `Words marked as 1x frequency (blue highlight): 'decree', 'Caesar'`.
 */
function extractQuotedWords(notes: string): string[] {
  const words: string[] = [];
  QUOTED_WORD_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null = QUOTED_WORD_PATTERN.exec(notes);
  while (match !== null) {
    const word = stripEdgePunctuation(match[1].trim());
    if (word.length > 0) {
      words.push(word);
    }
    match = QUOTED_WORD_PATTERN.exec(notes);
  }

  return words;
}

/** `Unique Beg.` and `Questions` both need to reach their singular rule key. */
function normalizeMarkRuleName(ruleName: string): string {
  return ruleName.trim().toLowerCase().replace(/\.+$/, '').replace(/s$/, '');
}

/**
 * Maps lowercased keyword -> tier for every 1x/2x/3x keyword rule on a verse.
 */
export function buildKeywordMap(matchedRules: readonly MatchedRule[]): Map<string, KeywordSegmentType> {
  const keywordMap = new Map<string, KeywordSegmentType>();

  for (const rule of matchedRules) {
    const tier = KEYWORD_RULES[rule.rule_name.trim().toLowerCase()];
    if (tier === undefined) {
      continue;
    }

    for (const word of extractQuotedWords(rule.notes)) {
      const key = word.toLowerCase();
      const existing = keywordMap.get(key);
      if (existing === undefined || KEYWORD_PRIORITY[tier] > KEYWORD_PRIORITY[existing]) {
        keywordMap.set(key, tier);
      }
    }
  }

  return keywordMap;
}

function withWordBoundaries(word: string): string {
  const escaped = escapeRegExp(word);
  const prefix = WORD_CHARACTER_PATTERN.test(word[0]) ? '\\b' : '';
  const suffix = WORD_CHARACTER_PATTERN.test(word[word.length - 1]) ? '\\b' : '';
  return `${prefix}${escaped}${suffix}`;
}

function buildScanner(keywords: readonly string[]): RegExp {
  // Longest first so multi-word keywords win over any single-word prefix.
  const alternatives = [...keywords]
    .sort((a, b) => b.length - a.length)
    .map(withWordBoundaries);

  alternatives.push(SLASH_PATTERN);

  return new RegExp(alternatives.join('|'), 'gi');
}

/** Keyword tiers plus any slash the verse text already carries, in reading order. */
function buildKeywordRanges(text: string, keywordMap: Map<string, KeywordSegmentType>): KeywordRange[] {
  const scanner = buildScanner([...keywordMap.keys()]);
  const ranges: KeywordRange[] = [];

  let match: RegExpExecArray | null = scanner.exec(text);
  while (match !== null) {
    const matchedText = match[0];

    // Zero-length matches would loop forever.
    if (matchedText.length === 0) {
      scanner.lastIndex += 1;
    } else {
      const tier = keywordMap.get(matchedText.toLowerCase());
      ranges.push({
        start: match.index,
        end: match.index + matchedText.length,
        type: tier ?? 'slash',
      });
    }

    match = scanner.exec(text);
  }

  return ranges;
}

/**
 * A beginning anchors to its first occurrence and an ending to its last, so a
 * phrase repeated inside the verse still underlines the intended edge.
 */
function locatePhrase(text: string, phrase: string, mark: VerseMark): { start: number; end: number } | null {
  const needle = phrase.toLowerCase();
  const haystack = text.toLowerCase();
  const index = mark === 'uniqueEnding' ? haystack.lastIndexOf(needle) : haystack.indexOf(needle);

  if (index === -1) {
    return null;
  }

  // The reference underlines an opening bracket that leads into the phrase.
  let start = index;
  while (start > 0 && OPENING_PUNCTUATION.has(text[start - 1])) {
    start -= 1;
  }

  return { start, end: index + phrase.length };
}

/** Fallback for question/exclamation rules that name no phrase of their own. */
function locateClauses(text: string, terminator: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  CLAUSE_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null = CLAUSE_PATTERN.exec(text);
  while (match !== null) {
    const clause = match[0];

    if (clause.endsWith(terminator)) {
      const start = match.index + (clause.length - clause.trimStart().length);
      const end = match.index + clause.length;
      if (end > start) {
        ranges.push({ start, end });
      }
    }

    match = CLAUSE_PATTERN.exec(text);
  }

  return ranges;
}

/** Two underlines cannot share a character, so the earliest range wins. */
function dropOverlaps(ranges: readonly MarkRange[]): MarkRange[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: MarkRange[] = [];

  for (const range of sorted) {
    const previous = kept[kept.length - 1];
    if (previous !== undefined && range.start < previous.end) {
      continue;
    }
    kept.push(range);
  }

  return kept;
}

function buildMarkRanges(matchedRules: readonly MatchedRule[], text: string): MarkRange[] {
  const ranges: MarkRange[] = [];

  for (const rule of matchedRules) {
    const mark = MARK_RULES[normalizeMarkRuleName(rule.rule_name)];
    if (mark === undefined) {
      continue;
    }

    const phrase = extractQuotedWords(rule.notes)[0];
    if (phrase !== undefined) {
      const range = locatePhrase(text, phrase, mark);
      if (range !== null) {
        ranges.push({ ...range, mark });
      }
      continue;
    }

    const terminator = CLAUSE_TERMINATORS[mark];
    if (terminator !== undefined) {
      for (const range of locateClauses(text, terminator)) {
        ranges.push({ ...range, mark });
      }
    }
  }

  return dropOverlaps(ranges);
}

/** Verse text that already spells out its slash must not get a second one. */
function hasSlashBeside(text: string, at: number, glyph: string, side: 'before' | 'after'): boolean {
  const neighbours = side === 'after' ? text.slice(at, at + 2) : text.slice(Math.max(0, at - 2), at);
  return neighbours.includes(glyph);
}

function buildSlashInjections(text: string, markRanges: readonly MarkRange[]): Map<number, string[]> {
  const injections = new Map<number, string[]>();

  for (const range of markRanges) {
    const slash = MARK_SLASHES[range.mark];
    if (slash === undefined) {
      continue;
    }

    const at = slash.side === 'after' ? range.end : range.start;
    if (hasSlashBeside(text, at, slash.glyph, slash.side)) {
      continue;
    }

    const existing = injections.get(at);
    if (existing === undefined) {
      injections.set(at, [slash.glyph]);
    } else {
      existing.push(slash.glyph);
    }
  }

  return injections;
}

/**
 * Converts a verse's raw text into ordered, styleable segments.
 *
 * Keyword tiers come from the verse's 1x/2x/3x keyword rules and are matched
 * case-insensitively on word boundaries. Structural rules (unique beginnings
 * and endings, questions, exclamations) become underline marks that layer over
 * those tiers, and the unique phrases gain their `/` and `\` recitation
 * slashes. `index_code` is never touched — the card back renders it separately.
 */
export function parseVerseToSegments(verse: Verse): VerseSegment[] {
  const text = verse.verse_text;
  if (text.length === 0) {
    return [];
  }

  const keywordMap = buildKeywordMap(verse.matched_rules);
  const keywordRanges = buildKeywordRanges(text, keywordMap);
  const markRanges = buildMarkRanges(verse.matched_rules, text);
  const injections = buildSlashInjections(text, markRanges);

  const boundaries = new Set<number>([0, text.length]);
  for (const range of [...keywordRanges, ...markRanges]) {
    boundaries.add(range.start);
    boundaries.add(range.end);
  }

  const points = [...boundaries].sort((a, b) => a - b);
  const segments: VerseSegment[] = [];

  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];

    // Slashes sit outside the underline, so they are emitted between runs.
    for (const glyph of injections.get(start) ?? []) {
      segments.push({ type: 'slash', content: glyph });
    }

    const end = points[index + 1];
    if (end === undefined) {
      break;
    }

    const type = keywordRanges.find((range) => range.start <= start && end <= range.end)?.type ?? 'text';
    const mark = markRanges.find((range) => range.start <= start && end <= range.end)?.mark;
    const content = text.slice(start, end);

    segments.push(mark === undefined ? { type, content } : { type, content, mark });
  }

  return segments;
}

export default parseVerseToSegments;
