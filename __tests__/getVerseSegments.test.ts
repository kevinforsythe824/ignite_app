import { cardToParseInput } from '../src/features/flashcards/data/mapFixtureToCard';
import type { Card } from '../src/features/flashcards/domain/card';
import { TEST_SEASON_ID } from '../src/features/flashcards/domain/testSeason';
import {
  clearVerseSegmentCache,
  getVerseSegments,
} from '../src/features/flashcards/utils/getVerseSegments';
import { parseVerseToSegments } from '../src/features/flashcards/utils/parseVerseToSegments';

const card: Card = {
  seasonId: TEST_SEASON_ID,
  cardId: 'cache-v1',
  cardNumber: 1,
  reference: 'Cache 1:1',
  verseText: "And it came to pass that 'grace' abounded.",
  indexCode: '100',
  matchedRules: [
    {
      ruleName: '1x Keyword',
      ruleCategory: 'Index',
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
    expect(getVerseSegments(card)).toEqual(parseVerseToSegments(cardToParseInput(card)));
  });

  it('returns the cached array on later calls for the same card identity', () => {
    const first = getVerseSegments(card);
    const second = getVerseSegments(card);

    expect(second).toBe(first);
  });

  it('parses again after the cache is cleared', () => {
    const first = getVerseSegments(card);
    clearVerseSegmentCache();
    const afterClear = getVerseSegments(card);

    expect(afterClear).toEqual(first);
    expect(afterClear).not.toBe(first);
  });
});
