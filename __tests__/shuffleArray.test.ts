import shuffleArray from '../src/utils/shuffleArray';

describe('shuffleArray', () => {
  it('returns a new array without mutating the input', () => {
    const input = [1, 2, 3, 4];
    const inputCopy = [...input];
    const result = shuffleArray(input);

    expect(result).not.toBe(input);
    expect(input).toEqual(inputCopy);
  });

  it('preserves length and elements', () => {
    const input = ['a', 'b', 'c'];
    const result = shuffleArray(input);

    expect(result).toHaveLength(input.length);
    expect(result.sort()).toEqual([...input].sort());
  });

  it('produces deterministic output when Math.random is mocked', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

    const first = shuffleArray([1, 2, 3]);
    const second = shuffleArray([1, 2, 3]);

    expect(first).toEqual(second);
    expect(first.sort()).toEqual([1, 2, 3]);

    randomSpy.mockRestore();
  });
});
