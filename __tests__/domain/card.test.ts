import { makeCardKey } from '../../src/features/flashcards/domain/card';

describe('makeCardKey', () => {
  it('joins seasonId, materialSetId, and cardId into a stable composite identity', () => {
    expect(makeCardKey('season-a', 'ms-1', 'c1')).toBe('season-a:ms-1:c1');
    expect(makeCardKey('season-a', 'ms-1', 'c1')).toBe(
      makeCardKey('season-a', 'ms-1', 'c1'),
    );
  });

  it('treats the same cardId in different seasons as distinct identities', () => {
    expect(makeCardKey('season-a', 'ms-1', 'v1')).not.toBe(
      makeCardKey('season-b', 'ms-1', 'v1'),
    );
  });

  it('treats the same cardId in different MaterialSets as distinct identities', () => {
    expect(makeCardKey('season-a', 'ms-cadet', 'v1')).not.toBe(
      makeCardKey('season-a', 'ms-experienced', 'v1'),
    );
  });

  it('allows the same Scripture reference to exist independently across MaterialSets', () => {
    const cadetKey = makeCardKey('season-a', 'ms-cadet', 'luke-2-1');
    const juniorKey = makeCardKey('season-a', 'ms-junior', 'luke-2-1');

    expect(cadetKey).not.toBe(juniorKey);
    expect(cadetKey).toBe('season-a:ms-cadet:luke-2-1');
    expect(juniorKey).toBe('season-a:ms-junior:luke-2-1');
  });
});
