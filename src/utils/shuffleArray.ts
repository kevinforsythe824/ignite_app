/**
 * Fisher-Yates shuffle. Returns a new array; the input is never mutated.
 */
export function shuffleArray<T>(items: readonly T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result;
}

export default shuffleArray;
