import mockVerseData from '../../src/data/mock-verse-data.json';
import type { FixtureCardRecord } from '../../src/features/flashcards/data/fixtureCardRecord';
import type { FirestoreCardDocument } from '../../src/features/flashcards/data/firestoreCardDocument';
import {
  InvalidCurriculumDocumentError,
  mapFirestoreCardToDomain,
  mapFirestoreCardsToDomain,
} from '../../src/features/flashcards/data/mapFirestoreToCard';
import { makeCardKey } from '../../src/features/flashcards/domain/card';
import { TEST_MATERIAL_SET_ID, TEST_SEASON_ID } from '../../src/features/flashcards/domain/testSeason';

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

const SNAKE_CASE_LEAKS = [
  'verse_text',
  'matched_rules',
  'index_code',
  'card_number',
  'rule_name',
  'rule_category',
];

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

function firestoreDocumentFromFixture(
  fixture: FixtureCardRecord,
  cardNumber: number,
): FirestoreCardDocument {
  return {
    card_number: cardNumber,
    reference: fixture.reference,
    verse_text: fixture.verse_text,
    index_code: fixture.index_code,
    matched_rules: fixture.matched_rules.map((rule) => ({ ...rule })),
    tags: [...fixture.tags],
  };
}

const validDocument = firestoreDocumentFromFixture(fixtures[0], 1);

describe('mapFirestoreCardToDomain', () => {
  it('maps a valid Firestore Card document to the domain Card', () => {
    const card = mapFirestoreCardToDomain(
      validDocument,
      TEST_SEASON_ID,
      TEST_MATERIAL_SET_ID,
      'v1',
    );

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

  it('uses path identity for seasonId and cardId, not document fields', () => {
    const card = mapFirestoreCardToDomain(
      { ...validDocument, seasonId: 'ignored', id: 'ignored' },
      'season-from-path',
      'ms-from-caller',
      'card-from-path',
    );

    expect(card.seasonId).toBe('season-from-path');
    expect(card.materialSetId).toBe('ms-from-caller');
    expect(card.cardId).toBe('card-from-path');
  });

  it('preserves stored cardNumber instead of deriving it from array position', () => {
    const card = mapFirestoreCardToDomain(
      firestoreDocumentFromFixture(fixtures[0], 42),
      TEST_SEASON_ID,
      TEST_MATERIAL_SET_ID,
      'v1',
    );

    expect(card.cardNumber).toBe(42);
  });

  it('maps reference, verseText, indexCode, matchedRules, and tags', () => {
    const card = mapFirestoreCardToDomain(
      validDocument,
      TEST_SEASON_ID,
      TEST_MATERIAL_SET_ID,
      'v1',
    );

    expect(card.reference).toBe(validDocument.reference);
    expect(card.verseText).toBe(validDocument.verse_text);
    expect(card.indexCode).toBe(validDocument.index_code);
    expect(card.matchedRules).toHaveLength(validDocument.matched_rules.length);
    expect(card.tags).toEqual(validDocument.tags);
  });

  it('treats the same cardId in different seasons as distinct Cards', () => {
    const seasonA = mapFirestoreCardToDomain(
      validDocument,
      'season-a',
      TEST_MATERIAL_SET_ID,
      'v1',
    );
    const seasonB = mapFirestoreCardToDomain(
      validDocument,
      'season-b',
      TEST_MATERIAL_SET_ID,
      'v1',
    );

    expect(seasonA.cardId).toBe(seasonB.cardId);
    expect(seasonA.seasonId).not.toBe(seasonB.seasonId);
    expect(makeCardKey(seasonA.seasonId, seasonA.materialSetId, seasonA.cardId)).not.toBe(
      makeCardKey(seasonB.seasonId, seasonB.materialSetId, seasonB.cardId),
    );
  });

  it('treats the same cardId in different MaterialSets as distinct Cards', () => {
    const cadet = mapFirestoreCardToDomain(validDocument, TEST_SEASON_ID, 'ms-cadet', 'v1');
    const experienced = mapFirestoreCardToDomain(
      validDocument,
      TEST_SEASON_ID,
      'ms-experienced',
      'v1',
    );

    expect(cadet.cardId).toBe(experienced.cardId);
    expect(cadet.reference).toBe(experienced.reference);
    expect(makeCardKey(cadet.seasonId, cadet.materialSetId, cadet.cardId)).not.toBe(
      makeCardKey(experienced.seasonId, experienced.materialSetId, experienced.cardId),
    );
  });

  it('does not leak Firestore snake_case field names into the domain Card', () => {
    const card = mapFirestoreCardToDomain(
      { ...validDocument, extra_persistence_field: 'ignore-me' },
      TEST_SEASON_ID,
      TEST_MATERIAL_SET_ID,
      'v1',
    );

    expect(Object.keys(card).sort()).toEqual([...EXPECTED_CARD_KEYS].sort());
    assertNoSnakeCaseLeak(card);
  });
});

describe('mapFirestoreCardToDomain validation', () => {
  it('fails when seasonId is missing or blank', () => {
    expect(() =>
      mapFirestoreCardToDomain(validDocument, '', TEST_MATERIAL_SET_ID, 'v1'),
    ).toThrow(InvalidCurriculumDocumentError);
    expect(() =>
      mapFirestoreCardToDomain(validDocument, '   ', TEST_MATERIAL_SET_ID, 'v1'),
    ).toThrow(/seasonId/);
  });

  it('fails when materialSetId is missing or blank', () => {
    expect(() => mapFirestoreCardToDomain(validDocument, TEST_SEASON_ID, '', 'v1')).toThrow(
      InvalidCurriculumDocumentError,
    );
    expect(() =>
      mapFirestoreCardToDomain(validDocument, TEST_SEASON_ID, '  ', 'v1'),
    ).toThrow(/materialSetId/);
  });

  it('fails when cardId is missing or blank', () => {
    expect(() =>
      mapFirestoreCardToDomain(validDocument, TEST_SEASON_ID, TEST_MATERIAL_SET_ID, ''),
    ).toThrow(InvalidCurriculumDocumentError);
    expect(() =>
      mapFirestoreCardToDomain(validDocument, TEST_SEASON_ID, TEST_MATERIAL_SET_ID, '  '),
    ).toThrow(/cardId/);
  });

  it('fails when card_number is missing or invalid', () => {
    const { card_number: _cardNumber, ...withoutNumber } = validDocument;
    expect(() =>
      mapFirestoreCardToDomain(withoutNumber, TEST_SEASON_ID, TEST_MATERIAL_SET_ID, 'v1'),
    ).toThrow(/card_number/);
    expect(() =>
      mapFirestoreCardToDomain(
        { ...validDocument, card_number: 0 },
        TEST_SEASON_ID,
        TEST_MATERIAL_SET_ID,
        'v1',
      ),
    ).toThrow(/card_number/);
    expect(() =>
      mapFirestoreCardToDomain(
        { ...validDocument, card_number: 1.5 },
        TEST_SEASON_ID,
        TEST_MATERIAL_SET_ID,
        'v1',
      ),
    ).toThrow(/card_number/);
    expect(() =>
      mapFirestoreCardToDomain(
        { ...validDocument, card_number: '1' },
        TEST_SEASON_ID,
        TEST_MATERIAL_SET_ID,
        'v1',
      ),
    ).toThrow(/card_number/);
  });

  it('fails when reference or verse text is missing', () => {
    expect(() =>
      mapFirestoreCardToDomain(
        { ...validDocument, reference: '' },
        TEST_SEASON_ID,
        TEST_MATERIAL_SET_ID,
        'v1',
      ),
    ).toThrow(/reference/);
    expect(() =>
      mapFirestoreCardToDomain(
        { ...validDocument, verse_text: undefined },
        TEST_SEASON_ID,
        TEST_MATERIAL_SET_ID,
        'v1',
      ),
    ).toThrow(/verse_text/);
  });

  it('fails when matched rules or tags are malformed', () => {
    expect(() =>
      mapFirestoreCardToDomain(
        { ...validDocument, matched_rules: [{ rule_name: 'Only name' }] },
        TEST_SEASON_ID,
        TEST_MATERIAL_SET_ID,
        'v1',
      ),
    ).toThrow(InvalidCurriculumDocumentError);
    expect(() =>
      mapFirestoreCardToDomain(
        { ...validDocument, tags: ['ok', 2] },
        TEST_SEASON_ID,
        TEST_MATERIAL_SET_ID,
        'v1',
      ),
    ).toThrow(/tags/);
  });

  it('does not silently produce a Card from a non-object document', () => {
    expect(() =>
      mapFirestoreCardToDomain(null, TEST_SEASON_ID, TEST_MATERIAL_SET_ID, 'v1'),
    ).toThrow(InvalidCurriculumDocumentError);
    expect(() =>
      mapFirestoreCardToDomain('not-a-card', TEST_SEASON_ID, TEST_MATERIAL_SET_ID, 'v1'),
    ).toThrow(InvalidCurriculumDocumentError);
  });
});

describe('mapFirestoreCardsToDomain', () => {
  it('maps snapshots without reordering by array position', () => {
    const cards = mapFirestoreCardsToDomain(
      [
        { cardId: 'v9', data: firestoreDocumentFromFixture(fixtures[8], 9) },
        { cardId: 'v1', data: firestoreDocumentFromFixture(fixtures[0], 1) },
      ],
      TEST_SEASON_ID,
      TEST_MATERIAL_SET_ID,
    );

    expect(cards.map((card) => card.cardId)).toEqual(['v9', 'v1']);
    expect(cards.map((card) => card.cardNumber)).toEqual([9, 1]);
    expect(cards.every((card) => card.seasonId === TEST_SEASON_ID)).toBe(true);
    expect(cards.every((card) => card.materialSetId === TEST_MATERIAL_SET_ID)).toBe(true);
  });
});
