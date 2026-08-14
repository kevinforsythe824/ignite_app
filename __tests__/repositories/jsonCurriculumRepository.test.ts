import { makeCardKey } from '../../src/features/flashcards/domain/card';
import { TEST_SEASON_ID } from '../../src/features/flashcards/domain/testSeason';
import {
  JsonCurriculumRepository,
  UnknownSeasonError,
} from '../../src/features/flashcards/repositories';

describe('JsonCurriculumRepository', () => {
  const repository = new JsonCurriculumRepository();

  it('returns the test-season curriculum as domain Cards', async () => {
    const curriculum = await repository.getCurriculum(TEST_SEASON_ID);

    expect(curriculum.seasonId).toBe(TEST_SEASON_ID);
    expect(curriculum.title).toBe('Luke 2:1-9');
    expect(curriculum.cards).toHaveLength(9);
    expect(curriculum.cards.map((card) => card.cardId)).toEqual([
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
    expect(curriculum.cards.every((card) => card.seasonId === TEST_SEASON_ID)).toBe(true);
    expect(curriculum.cards[0]).toMatchObject({
      cardId: 'v1',
      cardNumber: 1,
      reference: 'Luke 2:1',
      verseText: expect.any(String),
      indexCode: '103-2b',
    });
    expect(curriculum.cards[0]).not.toHaveProperty('verse_text');
  });

  it('uses seasonId + cardId as the Card identity', async () => {
    const curriculum = await repository.getCurriculum(TEST_SEASON_ID);
    const keys = curriculum.cards.map((card) => makeCardKey(card.seasonId, card.cardId));

    expect(keys[0]).toBe(`${TEST_SEASON_ID}:v1`);
    expect(new Set(keys).size).toBe(9);
  });

  it('rejects an unknown season', async () => {
    await expect(repository.getCurriculum('unknown-season')).rejects.toBeInstanceOf(
      UnknownSeasonError,
    );
    await expect(repository.getCurriculum('unknown-season')).rejects.toThrow(
      'No curriculum available for season "unknown-season"',
    );
  });
});
