import { makeCardKey } from '../../src/features/flashcards/domain/card';

describe('makeCardKey', () => {
  it('joins seasonId and cardId into a stable composite identity', () => {
    expect(makeCardKey('season-a', 'c1')).toBe('season-a:c1');
    expect(makeCardKey('season-a', 'c1')).toBe(makeCardKey('season-a', 'c1'));
  });

  it('treats the same cardId in different seasons as distinct identities', () => {
    expect(makeCardKey('season-a', 'v1')).not.toBe(makeCardKey('season-b', 'v1'));
  });
});
