import {
  InvalidCurriculumDocumentError,
  mapFirestoreCardToDomain,
  mapFirestoreCardsToDomain,
} from '../../src/features/flashcards/data/mapFirestoreToCard';
import { makeCardKey } from '../../src/features/flashcards/domain/card';

const SEASON_ID = 'season-synth';
const MATERIAL_SET_ID = 'set-alpha';
const CARD_ID = 'card-1';
const VERSE_TEXT = 'Alpha walks the silver path.';

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

function canonicalDocument(overrides: Record<string, unknown> = {}) {
  return {
    seasonId: SEASON_ID,
    materialSetId: MATERIAL_SET_ID,
    cardId: CARD_ID,
    cardNumber: 1,
    reference: 'Book 1:1',
    verseText: VERSE_TEXT,
    sectionId: 'section-1',
    ...overrides,
  };
}

function phraseAnnotation(type: string, annotationId = `ann-${type}`) {
  return {
    annotationId,
    cardId: CARD_ID,
    type,
    sourceTarget: {
      strategy: 'phraseOccurrence',
      phrase: 'silver',
      occurrenceIndex: 1,
    },
    resolvedTarget: { start: 0, end: 6 },
    notes: `${type} note`,
  };
}

describe('mapFirestoreCardToDomain', () => {
  it('maps a valid canonical card and omits indexCode and quiz metadata when absent', () => {
    const card = mapFirestoreCardToDomain(
      canonicalDocument(),
      SEASON_ID,
      MATERIAL_SET_ID,
      CARD_ID,
    );

    expect(card).toEqual({
      seasonId: SEASON_ID,
      materialSetId: MATERIAL_SET_ID,
      cardId: CARD_ID,
      cardNumber: 1,
      reference: 'Book 1:1',
      verseText: VERSE_TEXT,
      sectionId: 'section-1',
      matchedRules: [],
      tags: [],
      annotations: [],
      crossReferences: [],
    });
    expect(card).not.toHaveProperty('indexCode');
    expect(card).not.toHaveProperty('quizMetadata');
    assertNoSnakeCaseLeak(card);
  });

  it('keeps indexCode when the document includes it', () => {
    const card = mapFirestoreCardToDomain(
      canonicalDocument({ indexCode: 'A-1' }),
      SEASON_ID,
      MATERIAL_SET_ID,
      CARD_ID,
    );

    expect(card.indexCode).toBe('A-1');
  });

  it('preserves embedded annotations, including an unknown type, without matchedRules', () => {
    const types = [
      'highlight',
      'underline',
      'keyword',
      'uniqueBeginning',
      'uniqueEnding',
      'frequency',
      'crossReference',
      'rosterMark',
    ] as const;
    const card = mapFirestoreCardToDomain(
      canonicalDocument({
        annotations: types.map((type) => phraseAnnotation(type)),
        matched_rules: [{ rule_name: 'ignore', rule_category: 'ignore', notes: '' }],
        matchedRules: [{ ruleName: 'ignore', ruleCategory: 'ignore', notes: '' }],
      }),
      SEASON_ID,
      MATERIAL_SET_ID,
      CARD_ID,
    );

    expect(card.matchedRules).toEqual([]);
    expect(card.annotations?.map((annotation) => annotation.type)).toEqual([...types]);
    expect(card.annotations?.[0]).toEqual({
      annotationId: 'ann-highlight',
      cardId: CARD_ID,
      type: 'highlight',
      sourceTarget: {
        strategy: 'phraseOccurrence',
        phrase: 'silver',
        occurrenceIndex: 1,
      },
      resolvedTarget: { start: 0, end: 6 },
      notes: 'highlight note',
    });
    expect(card.annotations?.find((annotation) => annotation.type === 'rosterMark')).toMatchObject({
      type: 'rosterMark',
      cardId: CARD_ID,
    });
  });

  it('returns annotation cardId when it matches the owning card', () => {
    const card = mapFirestoreCardToDomain(
      canonicalDocument({ annotations: [phraseAnnotation('highlight')] }),
      SEASON_ID,
      MATERIAL_SET_ID,
      CARD_ID,
    );

    expect(card.annotations?.[0]?.cardId).toBe(CARD_ID);
    expect(card.matchedRules).toEqual([]);
  });

  it('fails when annotation cardId is missing, blank, or not a string', () => {
    const { cardId: _ownedCardId, ...missingCardId } = phraseAnnotation('highlight');
    const cases: unknown[] = [
      [missingCardId],
      [{ ...phraseAnnotation('highlight'), cardId: null }],
      [{ ...phraseAnnotation('highlight'), cardId: 1 }],
      [{ ...phraseAnnotation('highlight'), cardId: '' }],
      [{ ...phraseAnnotation('highlight'), cardId: '   ' }],
    ];

    for (const annotations of cases) {
      expect(() =>
        mapFirestoreCardToDomain(
          canonicalDocument({ annotations }),
          SEASON_ID,
          MATERIAL_SET_ID,
          CARD_ID,
        ),
      ).toThrow(InvalidCurriculumDocumentError);
    }
  });

  it('omits quiz metadata when absent and maps it when present', () => {
    const absent = mapFirestoreCardToDomain(
      canonicalDocument(),
      SEASON_ID,
      MATERIAL_SET_ID,
      CARD_ID,
    );
    const present = mapFirestoreCardToDomain(
      canonicalDocument({
        quizMetadata: { pointValue: 20, questionHint: 'Name the path.' },
      }),
      SEASON_ID,
      MATERIAL_SET_ID,
      CARD_ID,
    );

    expect(absent.quizMetadata).toBeUndefined();
    expect(present.quizMetadata).toEqual({
      pointValue: 20,
      questionHint: 'Name the path.',
    });
  });

  it('defaults cross references to an empty array and maps them when present', () => {
    const absent = mapFirestoreCardToDomain(
      canonicalDocument(),
      SEASON_ID,
      MATERIAL_SET_ID,
      CARD_ID,
    );
    const present = mapFirestoreCardToDomain(
      canonicalDocument({
        crossReferences: [
          {
            fromCardId: CARD_ID,
            toReference: 'Book 2:2',
            toCardId: 'card-9',
            notes: 'See the gate.',
          },
        ],
      }),
      SEASON_ID,
      MATERIAL_SET_ID,
      CARD_ID,
    );

    expect(absent.crossReferences).toEqual([]);
    expect(present.crossReferences).toEqual([
      {
        toReference: 'Book 2:2',
        toCardId: 'card-9',
        notes: 'See the gate.',
      },
    ]);
    expect(present.crossReferences?.[0]).not.toHaveProperty('fromCardId');
  });

  it('treats the same cardId in different seasons or MaterialSets as distinct Cards', () => {
    const seasonA = mapFirestoreCardToDomain(
      canonicalDocument({ seasonId: 'season-a' }),
      'season-a',
      MATERIAL_SET_ID,
      CARD_ID,
    );
    const seasonB = mapFirestoreCardToDomain(
      canonicalDocument({ seasonId: 'season-b' }),
      'season-b',
      MATERIAL_SET_ID,
      CARD_ID,
    );
    const otherSet = mapFirestoreCardToDomain(
      canonicalDocument({ materialSetId: 'set-beta' }),
      SEASON_ID,
      'set-beta',
      CARD_ID,
    );

    expect(makeCardKey(seasonA.seasonId, seasonA.materialSetId, seasonA.cardId)).not.toBe(
      makeCardKey(seasonB.seasonId, seasonB.materialSetId, seasonB.cardId),
    );
    expect(makeCardKey(seasonA.seasonId, seasonA.materialSetId, seasonA.cardId)).not.toBe(
      makeCardKey(otherSet.seasonId, otherSet.materialSetId, otherSet.cardId),
    );
    expect(seasonA.reference).toBe(otherSet.reference);
  });
});

describe('mapFirestoreCardToDomain validation', () => {
  it('fails when a required field is missing', () => {
    const { reference: _reference, ...withoutReference } = canonicalDocument();
    const { sectionId: _sectionId, ...withoutSection } = canonicalDocument();
    const { verseText: _verseText, ...withoutVerse } = canonicalDocument();

    expect(() =>
      mapFirestoreCardToDomain(withoutReference, SEASON_ID, MATERIAL_SET_ID, CARD_ID),
    ).toThrow(/reference/);
    expect(() =>
      mapFirestoreCardToDomain(withoutSection, SEASON_ID, MATERIAL_SET_ID, CARD_ID),
    ).toThrow(/sectionId/);
    expect(() =>
      mapFirestoreCardToDomain(withoutVerse, SEASON_ID, MATERIAL_SET_ID, CARD_ID),
    ).toThrow(/verseText/);
    expect(() =>
      mapFirestoreCardToDomain(canonicalDocument(), '', MATERIAL_SET_ID, CARD_ID),
    ).toThrow(/seasonId/);
  });

  it('fails when cardNumber is missing or invalid', () => {
    const { cardNumber: _cardNumber, ...withoutNumber } = canonicalDocument();
    expect(() =>
      mapFirestoreCardToDomain(withoutNumber, SEASON_ID, MATERIAL_SET_ID, CARD_ID),
    ).toThrow(/cardNumber/);
    expect(() =>
      mapFirestoreCardToDomain(
        canonicalDocument({ cardNumber: 0 }),
        SEASON_ID,
        MATERIAL_SET_ID,
        CARD_ID,
      ),
    ).toThrow(/cardNumber/);
    expect(() =>
      mapFirestoreCardToDomain(
        canonicalDocument({ cardNumber: 1.5 }),
        SEASON_ID,
        MATERIAL_SET_ID,
        CARD_ID,
      ),
    ).toThrow(/cardNumber/);
    expect(() =>
      mapFirestoreCardToDomain(
        canonicalDocument({ cardNumber: '1' }),
        SEASON_ID,
        MATERIAL_SET_ID,
        CARD_ID,
      ),
    ).toThrow(/cardNumber/);
  });

  it('fails when the document cardId does not match the Firestore document id', () => {
    expect(() =>
      mapFirestoreCardToDomain(
        canonicalDocument({ cardId: 'other-card' }),
        SEASON_ID,
        MATERIAL_SET_ID,
        CARD_ID,
      ),
    ).toThrow(InvalidCurriculumDocumentError);
    expect(() =>
      mapFirestoreCardToDomain(
        canonicalDocument({ cardId: 'other-card' }),
        SEASON_ID,
        MATERIAL_SET_ID,
        CARD_ID,
      ),
    ).toThrow(/cardId/);
  });

  it('fails when document seasonId or materialSetId does not match the request', () => {
    expect(() =>
      mapFirestoreCardToDomain(
        canonicalDocument({ seasonId: 'other-season' }),
        SEASON_ID,
        MATERIAL_SET_ID,
        CARD_ID,
      ),
    ).toThrow(/seasonId/);
    expect(() =>
      mapFirestoreCardToDomain(
        canonicalDocument({ materialSetId: 'other-set' }),
        SEASON_ID,
        MATERIAL_SET_ID,
        CARD_ID,
      ),
    ).toThrow(/materialSetId/);
    expect(() =>
      mapFirestoreCardToDomain(
        canonicalDocument({ materialSetId: undefined }),
        SEASON_ID,
        MATERIAL_SET_ID,
        CARD_ID,
      ),
    ).toThrow(/materialSetId/);
  });

  it('fails closed on a malformed annotation', () => {
    const cases: unknown[] = [
      [null],
      [{ type: 'highlight' }],
      [
        {
          ...phraseAnnotation('highlight'),
          resolvedTarget: { start: 8, end: 2 },
        },
      ],
      [
        {
          ...phraseAnnotation('highlight'),
          sourceTarget: { strategy: 'phraseOccurrence', occurrenceIndex: 1 },
        },
      ],
      [
        {
          ...phraseAnnotation('highlight'),
          sourceTarget: { strategy: 'phraseOccurrence', phrase: 'silver' },
        },
      ],
      [{ ...phraseAnnotation('highlight'), type: '' }],
      [{ ...phraseAnnotation('highlight'), type: 4 }],
      [{ ...phraseAnnotation('highlight'), cardId: 'someone-else' }],
    ];

    for (const annotations of cases) {
      expect(() =>
        mapFirestoreCardToDomain(
          canonicalDocument({ annotations }),
          SEASON_ID,
          MATERIAL_SET_ID,
          CARD_ID,
        ),
      ).toThrow(InvalidCurriculumDocumentError);
    }
  });

  it('does not silently produce a Card from a non-object document', () => {
    expect(() =>
      mapFirestoreCardToDomain(null, SEASON_ID, MATERIAL_SET_ID, CARD_ID),
    ).toThrow(InvalidCurriculumDocumentError);
    expect(() =>
      mapFirestoreCardToDomain('not-a-card', SEASON_ID, MATERIAL_SET_ID, CARD_ID),
    ).toThrow(InvalidCurriculumDocumentError);
  });
});

describe('mapFirestoreCardsToDomain', () => {
  it('maps snapshots without reordering by cardNumber', () => {
    const cards = mapFirestoreCardsToDomain(
      [
        {
          cardId: 'card-9',
          data: canonicalDocument({ cardId: 'card-9', cardNumber: 9 }),
        },
        {
          cardId: 'card-1',
          data: canonicalDocument({ cardId: CARD_ID, cardNumber: 1 }),
        },
      ],
      SEASON_ID,
      MATERIAL_SET_ID,
    );

    expect(cards.map((card) => card.cardId)).toEqual(['card-9', 'card-1']);
    expect(cards.map((card) => card.cardNumber)).toEqual([9, 1]);
  });
});
