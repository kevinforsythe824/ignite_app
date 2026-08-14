import type { Card } from '../src/features/flashcards/domain/card';
import { TEST_SEASON_ID } from '../src/features/flashcards/domain/testSeason';
import {
  filterVersesByCategory,
  verseMatchesCategory,
} from '../src/features/flashcards/utils/filterVersesByCategory';

function card(partial: Partial<Card> & Pick<Card, 'cardId' | 'tags'>): Card {
  return {
    seasonId: TEST_SEASON_ID,
    cardNumber: 1,
    reference: 'Test 1:1',
    verseText: 'Sample.',
    indexCode: '001',
    matchedRules: [],
    ...partial,
  };
}

describe('verseMatchesCategory', () => {
  it('matches Unique Beg. tags and rule names', () => {
    const withTag = card({ cardId: 'a', tags: ['Unique Beg.'] });
    const withRule = card({
      cardId: 'b',
      tags: [],
      matchedRules: [
        {
          ruleName: 'Unique Beginning',
          ruleCategory: 'Structural',
          notes: 'n/a',
        },
      ],
    });

    expect(verseMatchesCategory(withTag, 'uniqueBeginning')).toBe(true);
    expect(verseMatchesCategory(withRule, 'uniqueBeginning')).toBe(true);
    expect(verseMatchesCategory(withTag, 'uniqueEnding')).toBe(false);
  });

  it('matches Questions and Exclamations labels', () => {
    const question = card({ cardId: 'q', tags: ['Questions'] });
    const exclamation = card({ cardId: 'e', tags: ['Exclamation'] });

    expect(verseMatchesCategory(question, 'question')).toBe(true);
    expect(verseMatchesCategory(exclamation, 'exclamation')).toBe(true);
  });

  it('matches keyword tier tags and rule names', () => {
    const withTag = card({ cardId: 'k1', tags: ['1x Keyword'] });
    const withRule = card({
      cardId: 'k2',
      tags: [],
      matchedRules: [
        {
          ruleName: '2x Keyword',
          ruleCategory: 'Index',
          notes: "Words marked as 2x frequency: 'census'",
        },
      ],
    });
    const threeX = card({ cardId: 'k3', tags: ['3x Keyword'] });

    expect(verseMatchesCategory(withTag, 'keyword1x')).toBe(true);
    expect(verseMatchesCategory(withTag, 'keyword2x')).toBe(false);
    expect(verseMatchesCategory(withRule, 'keyword2x')).toBe(true);
    expect(verseMatchesCategory(threeX, 'keyword3x')).toBe(true);
  });

  it('matches semantic category tags and rule names', () => {
    const animals = card({ cardId: 'a1', tags: ['Animals'] });
    const proper = card({
      cardId: 'p1',
      tags: [],
      matchedRules: [
        {
          ruleName: 'Proper Name',
          ruleCategory: 'Index',
          notes: "Names: 'Caesar'",
        },
      ],
    });
    const body = card({ cardId: 'b1', tags: ['Body Parts'] });
    const geo = card({ cardId: 'g1', tags: ['Geo Location'] });

    expect(verseMatchesCategory(animals, 'animals')).toBe(true);
    expect(verseMatchesCategory(proper, 'properName')).toBe(true);
    expect(verseMatchesCategory(body, 'bodyParts')).toBe(true);
    expect(verseMatchesCategory(geo, 'geoLocation')).toBe(true);
    expect(verseMatchesCategory(animals, 'properName')).toBe(false);
  });
});

describe('filterVersesByCategory', () => {
  const cards = [
    card({ cardId: 'v1', tags: ['Unique Beg.'] }),
    card({ cardId: 'v2', tags: ['Unique End.'] }),
    card({ cardId: 'v3', tags: ['Questions', '1x Keyword'] }),
    card({ cardId: 'v4', tags: ['Animals', 'Proper Name'] }),
    card({ cardId: 'v5', tags: ['2x Keyword', 'Geo Location'] }),
    card({ cardId: 'v6', tags: ['Body Parts', '3x Keyword'] }),
  ];

  it('returns the full list when no filters are selected', () => {
    expect(filterVersesByCategory(cards, []).map((item) => item.cardId)).toEqual([
      'v1',
      'v2',
      'v3',
      'v4',
      'v5',
      'v6',
    ]);
  });

  it('unions multiple selected filters', () => {
    expect(
      filterVersesByCategory(cards, ['uniqueBeginning', 'question']).map((item) => item.cardId),
    ).toEqual(['v1', 'v3']);
  });

  it('filters keyword and semantic categories', () => {
    expect(
      filterVersesByCategory(cards, ['keyword1x', 'animals', 'bodyParts']).map(
        (item) => item.cardId,
      ),
    ).toEqual(['v3', 'v4', 'v6']);

    expect(
      filterVersesByCategory(cards, ['keyword2x', 'geoLocation']).map((item) => item.cardId),
    ).toEqual(['v5']);
  });
});
