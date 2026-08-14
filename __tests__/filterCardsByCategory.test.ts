import type { Card } from '../src/features/flashcards/domain/card';
import { TEST_SEASON_ID } from '../src/features/flashcards/domain/testSeason';
import {
  filterCardsByCategory,
  cardMatchesCategory,
} from '../src/features/flashcards/utils/filterCardsByCategory';

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

describe('cardMatchesCategory', () => {
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

    expect(cardMatchesCategory(withTag, 'uniqueBeginning')).toBe(true);
    expect(cardMatchesCategory(withRule, 'uniqueBeginning')).toBe(true);
    expect(cardMatchesCategory(withTag, 'uniqueEnding')).toBe(false);
  });

  it('matches Questions and Exclamations labels', () => {
    const question = card({ cardId: 'q', tags: ['Questions'] });
    const exclamation = card({ cardId: 'e', tags: ['Exclamation'] });

    expect(cardMatchesCategory(question, 'question')).toBe(true);
    expect(cardMatchesCategory(exclamation, 'exclamation')).toBe(true);
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

    expect(cardMatchesCategory(withTag, 'keyword1x')).toBe(true);
    expect(cardMatchesCategory(withTag, 'keyword2x')).toBe(false);
    expect(cardMatchesCategory(withRule, 'keyword2x')).toBe(true);
    expect(cardMatchesCategory(threeX, 'keyword3x')).toBe(true);
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

    expect(cardMatchesCategory(animals, 'animals')).toBe(true);
    expect(cardMatchesCategory(proper, 'properName')).toBe(true);
    expect(cardMatchesCategory(body, 'bodyParts')).toBe(true);
    expect(cardMatchesCategory(geo, 'geoLocation')).toBe(true);
    expect(cardMatchesCategory(animals, 'properName')).toBe(false);
  });
});

describe('filterCardsByCategory', () => {
  const cards = [
    card({ cardId: 'v1', tags: ['Unique Beg.'] }),
    card({ cardId: 'v2', tags: ['Unique End.'] }),
    card({ cardId: 'v3', tags: ['Questions', '1x Keyword'] }),
    card({ cardId: 'v4', tags: ['Animals', 'Proper Name'] }),
    card({ cardId: 'v5', tags: ['2x Keyword', 'Geo Location'] }),
    card({ cardId: 'v6', tags: ['Body Parts', '3x Keyword'] }),
  ];

  it('returns the full list when no filters are selected', () => {
    expect(filterCardsByCategory(cards, []).map((item) => item.cardId)).toEqual([
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
      filterCardsByCategory(cards, ['uniqueBeginning', 'question']).map((item) => item.cardId),
    ).toEqual(['v1', 'v3']);
  });

  it('filters keyword and semantic categories', () => {
    expect(
      filterCardsByCategory(cards, ['keyword1x', 'animals', 'bodyParts']).map(
        (item) => item.cardId,
      ),
    ).toEqual(['v3', 'v4', 'v6']);

    expect(
      filterCardsByCategory(cards, ['keyword2x', 'geoLocation']).map((item) => item.cardId),
    ).toEqual(['v5']);
  });
});
