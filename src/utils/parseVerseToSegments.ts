import type { MatchedRule, SegmentType, Verse, VerseSegment } from '../types/verse';

type KeywordSegmentType = Extract<SegmentType, 'keyword1x' | 'keyword2x' | 'keyword3x'>;

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

const QUOTED_WORD_PATTERN = /'([^']+)'/g;
const EDGE_PUNCTUATION_PATTERN = /^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g;
const WORD_CHARACTER_PATTERN = /[A-Za-z0-9_]/;
const SLASH_PATTERN = '[/\\\\]';

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

/**
 * Converts a verse's raw text into ordered, styleable segments.
 *
 * Keyword tiers come from the verse's 1x/2x/3x keyword rules and are matched
 * case-insensitively on word boundaries. Recitation slashes (`/` and `\`) are
 * emitted as their own segments. `index_code` is never touched — the card back
 * renders it separately.
 */
export function parseVerseToSegments(verse: Verse): VerseSegment[] {
  const text = verse.verse_text;
  if (text.length === 0) {
    return [];
  }

  const keywordMap = buildKeywordMap(verse.matched_rules);
  const scanner = buildScanner([...keywordMap.keys()]);
  const segments: VerseSegment[] = [];

  let cursor = 0;
  let match: RegExpExecArray | null = scanner.exec(text);

  while (match !== null) {
    const matchedText = match[0];

    if (match.index > cursor) {
      segments.push({ type: 'text', content: text.slice(cursor, match.index) });
    }

    const tier = keywordMap.get(matchedText.toLowerCase());
    segments.push({ type: tier ?? 'slash', content: matchedText });

    cursor = match.index + matchedText.length;

    // Zero-length matches would loop forever.
    if (matchedText.length === 0) {
      scanner.lastIndex += 1;
    }

    match = scanner.exec(text);
  }

  if (cursor < text.length) {
    segments.push({ type: 'text', content: text.slice(cursor) });
  }

  return segments;
}

export default parseVerseToSegments;
