import type { FixtureCardRecord } from '../../src/features/flashcards/data/fixtureCardRecord';
import type { FirestoreCardDocument } from '../../src/features/flashcards/data/firestoreCardDocument';
import { InvalidCurriculumDocumentError } from '../../src/features/flashcards/data/mapFirestoreToCard';
import { TEST_SEASON_ID } from '../../src/features/flashcards/domain/testSeason';
import mockVerseData from '../../src/data/mock-verse-data.json';
import {
  CurriculumPersistenceError,
  FirestoreCurriculumRepository,
  UnknownSeasonError,
  type CurriculumFirestoreSource,
} from '../../src/features/flashcards/repositories';

const fixtures = mockVerseData as FixtureCardRecord[];

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

function createSource(
  overrides: Partial<CurriculumFirestoreSource> = {},
): CurriculumFirestoreSource {
  return {
    getSeason: jest.fn(),
    listCardsOrderedByNumber: jest.fn(),
    ...overrides,
  };
}

describe('FirestoreCurriculumRepository', () => {
  it('returns StudyCurriculum from season metadata and valid cards', async () => {
    const source = createSource({
      getSeason: jest.fn().mockResolvedValue({
        exists: true,
        data: { title: 'Luke 2:1-9' },
      }),
      listCardsOrderedByNumber: jest.fn().mockResolvedValue([
        { cardId: 'v1', data: firestoreDocumentFromFixture(fixtures[0], 1) },
        { cardId: 'v2', data: firestoreDocumentFromFixture(fixtures[1], 2) },
      ]),
    });
    const repository = new FirestoreCurriculumRepository(source);

    const curriculum = await repository.getCurriculum(TEST_SEASON_ID);

    expect(curriculum).toEqual({
      seasonId: TEST_SEASON_ID,
      title: 'Luke 2:1-9',
      cards: [
        expect.objectContaining({
          seasonId: TEST_SEASON_ID,
          cardId: 'v1',
          cardNumber: 1,
          reference: 'Luke 2:1',
          verseText: fixtures[0].verse_text,
          indexCode: '103-2b',
        }),
        expect.objectContaining({
          seasonId: TEST_SEASON_ID,
          cardId: 'v2',
          cardNumber: 2,
        }),
      ],
    });
    expect(source.getSeason).toHaveBeenCalledWith(TEST_SEASON_ID);
    expect(source.listCardsOrderedByNumber).toHaveBeenCalledWith(TEST_SEASON_ID);
  });

  it('scopes Cards to the requested season and uses document ids as cardId', async () => {
    const source = createSource({
      getSeason: jest.fn().mockResolvedValue({ exists: true, data: { title: 'Season B' } }),
      listCardsOrderedByNumber: jest.fn().mockResolvedValue([
        { cardId: 'v1', data: firestoreDocumentFromFixture(fixtures[0], 1) },
      ]),
    });
    const repository = new FirestoreCurriculumRepository(source);

    const curriculum = await repository.getCurriculum('season-b');

    expect(curriculum.seasonId).toBe('season-b');
    expect(curriculum.cards[0].seasonId).toBe('season-b');
    expect(curriculum.cards[0].cardId).toBe('v1');
  });

  it('preserves official cardNumber order from the ordered Firestore query', async () => {
    const source = createSource({
      getSeason: jest.fn().mockResolvedValue({ exists: true, data: { title: 'Ordered' } }),
      listCardsOrderedByNumber: jest.fn().mockResolvedValue([
        { cardId: 'later-id', data: firestoreDocumentFromFixture(fixtures[0], 1) },
        { cardId: 'earlier-id', data: firestoreDocumentFromFixture(fixtures[1], 2) },
      ]),
    });
    const repository = new FirestoreCurriculumRepository(source);

    const curriculum = await repository.getCurriculum(TEST_SEASON_ID);

    expect(curriculum.cards.map((card) => card.cardId)).toEqual(['later-id', 'earlier-id']);
    expect(curriculum.cards.map((card) => card.cardNumber)).toEqual([1, 2]);
  });

  it('maps Firestore DTOs through the domain Card mapper', async () => {
    const source = createSource({
      getSeason: jest.fn().mockResolvedValue({ exists: true, data: { title: 'Mapped' } }),
      listCardsOrderedByNumber: jest.fn().mockResolvedValue([
        { cardId: 'v1', data: firestoreDocumentFromFixture(fixtures[0], 1) },
      ]),
    });
    const repository = new FirestoreCurriculumRepository(source);

    const card = (await repository.getCurriculum(TEST_SEASON_ID)).cards[0];

    expect(card).not.toHaveProperty('verse_text');
    expect(card).not.toHaveProperty('card_number');
    expect(card).not.toHaveProperty('matched_rules');
    expect(card.verseText).toBe(fixtures[0].verse_text);
    expect(card.matchedRules[0]).toEqual({
      ruleName: fixtures[0].matched_rules[0].rule_name,
      ruleCategory: fixtures[0].matched_rules[0].rule_category,
      notes: fixtures[0].matched_rules[0].notes,
    });
  });

  it('throws UnknownSeasonError when the season document does not exist', async () => {
    const source = createSource({
      getSeason: jest.fn().mockResolvedValue({ exists: false, data: undefined }),
      listCardsOrderedByNumber: jest.fn(),
    });
    const repository = new FirestoreCurriculumRepository(source);

    await expect(repository.getCurriculum('missing-season')).rejects.toBeInstanceOf(
      UnknownSeasonError,
    );
    await expect(repository.getCurriculum('missing-season')).rejects.toThrow(
      'No curriculum available for season "missing-season"',
    );
    expect(source.listCardsOrderedByNumber).not.toHaveBeenCalled();
  });

  it('returns an empty card list when the season exists but has no cards', async () => {
    const source = createSource({
      getSeason: jest.fn().mockResolvedValue({ exists: true, data: { title: 'Empty season' } }),
      listCardsOrderedByNumber: jest.fn().mockResolvedValue([]),
    });
    const repository = new FirestoreCurriculumRepository(source);

    await expect(repository.getCurriculum(TEST_SEASON_ID)).resolves.toEqual({
      seasonId: TEST_SEASON_ID,
      title: 'Empty season',
      cards: [],
    });
  });

  it('throws InvalidCurriculumDocumentError for a malformed Card', async () => {
    const source = createSource({
      getSeason: jest.fn().mockResolvedValue({ exists: true, data: { title: 'Broken' } }),
      listCardsOrderedByNumber: jest.fn().mockResolvedValue([
        { cardId: 'v1', data: { card_number: 1 } },
      ]),
    });
    const repository = new FirestoreCurriculumRepository(source);

    await expect(repository.getCurriculum(TEST_SEASON_ID)).rejects.toBeInstanceOf(
      InvalidCurriculumDocumentError,
    );
  });

  it('translates permission-denied into CurriculumPersistenceError', async () => {
    const source = createSource({
      getSeason: jest.fn().mockRejectedValue({
        code: 'permission-denied',
        message: 'Missing or insufficient permissions.',
      }),
    });
    const repository = new FirestoreCurriculumRepository(source);

    await expect(repository.getCurriculum(TEST_SEASON_ID)).rejects.toMatchObject({
      name: 'CurriculumPersistenceError',
      code: 'permission-denied',
      message: 'You do not have permission to load this curriculum.',
    });
  });

  it('translates unavailable/network failure into CurriculumPersistenceError', async () => {
    const source = createSource({
      getSeason: jest.fn().mockResolvedValue({ exists: true, data: { title: 'Live' } }),
      listCardsOrderedByNumber: jest.fn().mockRejectedValue({
        code: 'unavailable',
        message: 'The service is currently unavailable.',
      }),
    });
    const repository = new FirestoreCurriculumRepository(source);

    await expect(repository.getCurriculum(TEST_SEASON_ID)).rejects.toBeInstanceOf(
      CurriculumPersistenceError,
    );
    await expect(repository.getCurriculum(TEST_SEASON_ID)).rejects.toMatchObject({
      code: 'unavailable',
      message: 'Curriculum is temporarily unavailable. Check your connection and try again.',
    });
  });

  it('translates unexpected infrastructure errors without leaking SDK messages', async () => {
    const source = createSource({
      getSeason: jest.fn().mockRejectedValue(new Error('INTERNAL assert failed at sdk.ts:12')),
    });
    const repository = new FirestoreCurriculumRepository(source);

    await expect(repository.getCurriculum(TEST_SEASON_ID)).rejects.toMatchObject({
      name: 'CurriculumPersistenceError',
      code: 'unexpected',
      message: 'Unable to load curriculum.',
    });
  });
});
