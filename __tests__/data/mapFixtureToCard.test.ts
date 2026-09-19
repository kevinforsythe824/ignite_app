import mockVerseData from '../../src/data/mock-verse-data.json';
import {
  cardToParseInput,
  mapFixtureToCard,
  mapFixturesToCards,
} from '../../src/features/flashcards/data/mapFixtureToCard';
import type { FixtureCardRecord } from '../../src/features/flashcards/data/fixtureCardRecord';
import { TEST_MATERIAL_SET_ID, TEST_SEASON_ID } from '../../src/features/flashcards/domain/testSeason';
import type { Card } from '../../src/features/flashcards/domain/card';
import type { Verse } from '../../src/features/flashcards/types/verse';
import { parseVerseToSegments } from '../../src/features/flashcards/utils/parseVerseToSegments';

const fixtures = mockVerseData as FixtureCardRecord[];

const EXPECTED_CARD_KEYS = [
  'seasonId',
  'materialSetId',
  'cardId',
  'cardNumber',
  'reference',
  'verseText',
  'indexCode',
  'matchedRules',
  'tags',
] as const;

const SNAKE_CASE_LEAKS = ['verse_text', 'matched_rules', 'index_code', 'rule_name', 'rule_category'];

function assertNoSnakeCaseLeak(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(assertNoSnakeCaseLeak);
    return;
  }
  if (value === null || typeof value !== 'object') {
    return;
  }
  for (const key of Object.keys(value)) {
    expect(SNAKE_CASE_LEAKS).not.toContain(key);
    assertNoSnakeCaseLeak((value as Record<string, unknown>)[key]);
  }
}

describe('mapFixtureToCard', () => {
  it('maps a fixture record to camelCase Card fields', () => {
    const card = mapFixtureToCard(fixtures[0], TEST_SEASON_ID, TEST_MATERIAL_SET_ID, 1);

    expect(card).toEqual({
      seasonId: TEST_SEASON_ID,
      materialSetId: TEST_MATERIAL_SET_ID,
      cardId: 'v1',
      cardNumber: 1,
      reference: 'Luke 2:1',
      verseText: fixtures[0].verse_text,
      indexCode: '103-2b',
      matchedRules: fixtures[0].matched_rules.map((rule) => ({
        ruleName: rule.rule_name,
        ruleCategory: rule.rule_category,
        notes: rule.notes,
      })),
      tags: fixtures[0].tags,
    });
  });

  it('preserves fixture ids as cardId', () => {
    expect(mapFixtureToCard(fixtures[0], TEST_SEASON_ID, TEST_MATERIAL_SET_ID, 1).cardId).toBe(
      'v1',
    );
  });
});

describe('mapFixturesToCards', () => {
  const cards = mapFixturesToCards(fixtures, TEST_SEASON_ID, TEST_MATERIAL_SET_ID);

  it('maps all nine mock cards in fixture order', () => {
    expect(cards).toHaveLength(9);
    expect(cards.map((card) => card.cardId)).toEqual([
      'v1',
      'v2',
      'v3',
      'v4',
      'v5',
      'v6',
      'v7',
      'v8',
      'v9',
    ]);
    expect(cards.map((card) => card.cardNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(cards.map((card) => card.reference)).toEqual([
      'Luke 2:1',
      'Luke 2:2',
      'Luke 2:3',
      'Luke 2:4',
      'Luke 2:5',
      'Luke 2:6',
      'Luke 2:7',
      'Luke 2:8',
      'Luke 2:9',
    ]);
    expect(cards.every((card) => card.seasonId === TEST_SEASON_ID)).toBe(true);
    expect(cards.every((card) => card.materialSetId === TEST_MATERIAL_SET_ID)).toBe(true);
  });

  it('uses only camelCase domain fields — JSON snake_case does not leak', () => {
    for (const card of cards) {
      expect(Object.keys(card).sort()).toEqual([...EXPECTED_CARD_KEYS].sort());
      assertNoSnakeCaseLeak(card);
    }
  });

  it('copies verse text, index code, tags, and rule count from each fixture row', () => {
    cards.forEach((card, index) => {
      const fixture = fixtures[index];
      expect(card.verseText).toBe(fixture.verse_text);
      expect(card.indexCode).toBe(fixture.index_code);
      expect(card.tags).toEqual(fixture.tags);
      expect(card.matchedRules).toHaveLength(fixture.matched_rules.length);
    });
  });
});

describe('cardToParseInput', () => {
  it('adapts a Card into the Verse shape parseVerseToSegments already expects', () => {
    const card: Card = mapFixtureToCard(fixtures[0], TEST_SEASON_ID, TEST_MATERIAL_SET_ID, 1);
    const parseInput = cardToParseInput(card);
    const fixtureAsVerse = fixtures[0] as Verse;

    expect(parseInput).toEqual({
      id: 'v1',
      reference: fixtureAsVerse.reference,
      verse_text: fixtureAsVerse.verse_text,
      index_code: fixtureAsVerse.index_code,
      matched_rules: fixtureAsVerse.matched_rules,
      tags: fixtureAsVerse.tags,
    });
    expect(parseVerseToSegments(parseInput)).toEqual(parseVerseToSegments(fixtureAsVerse));
  });
});
