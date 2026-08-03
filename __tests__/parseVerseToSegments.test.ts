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

describe('structural marks', () => {
  function markVerse(ruleName: string, notes: string, verseText: string): Verse {
    return {
      ...v1,
      verse_text: verseText,
      matched_rules: [{ rule_name: ruleName, rule_category: 'Structural', notes }],
    };
  }

  it('underlines the unique beginning and follows it with a slash', () => {
    const segments = parseVerseToSegments(v1);

    expect(segments[0]).toEqual({
      type: 'text',
      content: 'And it came to pass in those days, that there',
      mark: 'uniqueBeginning',
    });
    expect(segments[1]).toEqual({ type: 'slash', content: '/' });
  });

  it('keeps the underline running through a highlighted keyword', () => {
    const segments = parseVerseToSegments(mockVerseData[1] as Verse);

    // Luke 2:2 opens `(And this taxing`, where `taxing` is a 1x keyword.
    expect(segments[0]).toEqual({ type: 'text', content: '(And this ', mark: 'uniqueBeginning' });
    expect(segments[1]).toEqual({ type: 'keyword1x', content: 'taxing', mark: 'uniqueBeginning' });
    expect(segments[2]).toEqual({ type: 'slash', content: '/' });
  });

  it('precedes a unique ending with a backslash', () => {
    const verse = markVerse(
      'Unique End.',
      "Matches unique ending phrase: 'sore afraid'",
      'And they were sore afraid.',
    );

    const segments = parseVerseToSegments(verse);
    const slashIndex = segments.findIndex((segment) => segment.type === 'slash');

    expect(segments[slashIndex]).toEqual({ type: 'slash', content: '\\' });
    expect(segments[slashIndex + 1]).toEqual({
      type: 'text',
      content: 'sore afraid',
      mark: 'uniqueEnding',
    });
  });

  it('marks questions and exclamations without adding a slash', () => {
    const question = parseVerseToSegments(
      markVerse('Questions', "Contains a question: 'Why is it'", 'Why is it that ye sought me?'),
    );
    const exclamation = parseVerseToSegments(
      markVerse('Exclamations', "Contains an exclamation: 'Behold'", 'Behold, a great light!'),
    );

    expect(question[0].mark).toBe('question');
    expect(exclamation[0].mark).toBe('exclamation');
    expect([...question, ...exclamation].some((segment) => segment.type === 'slash')).toBe(false);
  });

  it('falls back to the terminating clause when a question rule quotes no phrase', () => {
    const verse = markVerse('Questions', 'Verse contains a question.', 'He came. How long? Then he left.');
    const marked = parseVerseToSegments(verse).filter((segment) => segment.mark === 'question');

    expect(marked.map((segment) => segment.content).join('')).toBe('How long?');
  });

  it('does not add a second slash when the verse text already has one', () => {
    const verse = markVerse('Unique Beg.', "Matches unique beginning phrase: 'And all went'", 'And all went / to be taxed.');

    const slashes = parseVerseToSegments(verse).filter((segment) => segment.type === 'slash');
    expect(slashes).toHaveLength(1);
  });

  it('ignores a phrase that does not appear in the verse text', () => {
    const verse = markVerse('Unique Beg.', "Matches unique beginning phrase: 'Nowhere to be found'", 'And all went to be taxed.');

    const segments = parseVerseToSegments(verse);
    expect(segments.some((segment) => segment.mark !== undefined)).toBe(false);
    expect(segments.some((segment) => segment.type === 'slash')).toBe(false);
  });
});
