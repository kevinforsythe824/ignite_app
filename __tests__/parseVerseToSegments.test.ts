import mockVerseData from '../src/data/mock-verse-data.json';
import type { MatchedRule, Verse } from '../src/types/verse';
import { buildKeywordMap, parseVerseToSegments } from '../src/utils/parseVerseToSegments';

const v1 = mockVerseData[0] as Verse;

function segmentTypesFor(content: string, segments: ReturnType<typeof parseVerseToSegments>): string | undefined {
  return segments.find((segment) => segment.content === content)?.type;
}

describe('buildKeywordMap', () => {
  it('maps 1x, 2x, and 3x keywords from matched rules', () => {
    const keywordMap = buildKeywordMap(v1.matched_rules);

    expect(keywordMap.get('decree')).toBe('keyword1x');
    expect(keywordMap.get('caesar')).toBe('keyword1x');
    expect(keywordMap.get('augustus')).toBe('keyword1x');
    expect(keywordMap.get('taxed')).toBe('keyword3x');
  });

  it('gives the highest tier when the same word appears in multiple keyword rules', () => {
    const rules: MatchedRule[] = [
      {
        rule_name: '1x Keyword',
        rule_category: 'Index',
        notes: "Words marked as 1x frequency (blue highlight): 'grace'",
      },
      {
        rule_name: '3x Keyword',
        rule_category: 'Index',
        notes: "Word marked as 3x frequency (orange highlight): 'grace'",
      },
    ];

    expect(buildKeywordMap(rules).get('grace')).toBe('keyword3x');
  });
});

describe('parseVerseToSegments', () => {
  it('returns an empty array for empty verse text', () => {
    const verse: Verse = { ...v1, verse_text: '' };
    expect(parseVerseToSegments(verse)).toEqual([]);
  });

  it('tags Luke 2:1 keywords with the correct tiers', () => {
    const segments = parseVerseToSegments(v1);

    expect(segmentTypesFor('decree', segments)).toBe('keyword1x');
    expect(segmentTypesFor('Caesar', segments)).toBe('keyword1x');
    expect(segmentTypesFor('Augustus', segments)).toBe('keyword1x');
    expect(segmentTypesFor('taxed', segments)).toBe('keyword3x');
  });

  it('matches keywords case-insensitively', () => {
    const verse: Verse = {
      ...v1,
      verse_text: 'CAESAR went out.',
      matched_rules: [
        {
          rule_name: '1x Keyword',
          rule_category: 'Index',
          notes: "Words marked as 1x frequency (blue highlight): 'Caesar'",
        },
      ],
    };

    const segments = parseVerseToSegments(verse);
    expect(segmentTypesFor('CAESAR', segments)).toBe('keyword1x');
  });

  it('emits slash characters as slash segments', () => {
    const verse: Verse = {
      ...v1,
      verse_text: 'word / more \\ end',
      matched_rules: [],
    };

    const segments = parseVerseToSegments(verse);
    expect(segments.filter((segment) => segment.type === 'slash').map((segment) => segment.content)).toEqual([
      '/',
      '\\',
    ]);
  });

  it('does not include index_code in segments', () => {
    const segments = parseVerseToSegments(v1);
    const combined = segments.map((segment) => segment.content).join('');
    expect(combined).not.toContain(v1.index_code);
  });
});
