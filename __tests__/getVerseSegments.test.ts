import type { Verse } from '../src/features/flashcards/types/verse';
import {
  clearVerseSegmentCache,
  getVerseSegments,
} from '../src/features/flashcards/utils/getVerseSegments';
import { parseVerseToSegments } from '../src/features/flashcards/utils/parseVerseToSegments';

const verse: Verse = {
  id: 'cache-v1',
  reference: 'Cache 1:1',
  verse_text: "And it came to pass that 'grace' abounded.",
  index_code: '100',
  matched_rules: [
    {
      rule_name: '1x Keyword',
      rule_category: 'Index',
      notes: "Words marked as 1x frequency (blue highlight): 'grace'",
    },
  ],
  tags: [],
};

describe('getVerseSegments', () => {
  beforeEach(() => {
    clearVerseSegmentCache();
  });

  it('matches parseVerseToSegments output', () => {
    expect(getVerseSegments(verse)).toEqual(parseVerseToSegments(verse));
  });

  it('returns the cached array on later calls for the same verse id', () => {
    const first = getVerseSegments(verse);
    const second = getVerseSegments(verse);

    expect(second).toBe(first);
  });

  it('parses again after the cache is cleared', () => {
    const first = getVerseSegments(verse);
    clearVerseSegmentCache();
    const afterClear = getVerseSegments(verse);

    expect(afterClear).toEqual(first);
    expect(afterClear).not.toBe(first);
  });
});
