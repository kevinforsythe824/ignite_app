/**
 * Presentation helper: initials from first/last name for avatar UI.
 * Not QuizzerProfile domain state — do not persist.
 *
 * Uses Unicode code points via Array.from. Complex emoji/ZWJ grapheme clusters
 * are a known low-priority limitation — no extra dependency for MVP initials.
 */
export function deriveInitials(firstName: string, lastName: string): string {
  const first = firstGrapheme(firstName.trim());
  const last = firstGrapheme(lastName.trim());

  if (first && last) {
    return `${first}${last}`;
  }
  if (first) {
    return first;
  }
  if (last) {
    return last;
  }
  return '?';
}

function firstGrapheme(value: string): string | undefined {
  if (value.length === 0) {
    return undefined;
  }
  // Array.from splits by Unicode code points (adequate for common name scripts).
  const [grapheme] = Array.from(value);
  return grapheme;
}
