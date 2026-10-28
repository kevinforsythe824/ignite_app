/**
 * @jest-environment node
 */
import { findWholeWordOccurrences } from '../../scripts/content-pipeline/sponsorWordMatch';

function slices(verseText: string, word: string): string[] {
  return findWholeWordOccurrences(verseText, word).map((span) => verseText.slice(span.start, span.end));
}

describe('sponsor whole-word matching', () => {
  const verse = "He saw the joint-heirs and the Lord's heirs.";

  it('rejects he inside the, heirs, and joint-heirs', () => {
    expect(slices(verse, 'he')).toEqual(['He']);
    expect(slices(verse, 'the')).toEqual(['the', 'the']);
    expect(slices("he'll stay", 'he')).toEqual([]);
    expect(slices('he will', 'he')).toEqual(['he']);
  });

  it('treats hyphen as part of the word', () => {
    expect(slices(verse, 'heirs')).toEqual(['heirs']);
    expect(slices(verse, 'joint')).toEqual([]);
    expect(slices(verse, 'joint-heirs')).toEqual(['joint-heirs']);
    expect(slices('a well-known name', 'known')).toEqual([]);
    expect(slices('a well-known name', 'well-known')).toEqual(['well-known']);
  });

  it('matches apostrophe variants without changing the verse slice', () => {
    const curly = 'the lord’s house';
    const modifier = 'meet at oʼclock today';
    expect(slices(verse, "lord's")).toEqual(["Lord's"]);
    expect(slices(curly, "lord's")).toEqual(['lord’s']);
    expect(slices("The LORD'S day", 'lord’s')).toEqual(["LORD'S"]);
    expect(slices(modifier, "o'clock")).toEqual(['oʼclock']);
    expect(slices("don't go", 'don')).toEqual([]);
    expect(slices("don't go", "don't")).toEqual(["don't"]);
    expect(curly).toBe('the lord’s house');
  });

  it('matches lowercase source against uppercase and mixed-case scripture', () => {
    expect(slices('The LORD is HE and he.', 'he')).toEqual(['HE', 'he']);
    expect(slices('The LORD is HE and he.', 'lord')).toEqual(['LORD']);
    expect(slices('Hope and hope and Hope.', 'hope')).toEqual(['Hope', 'hope', 'Hope']);
    expect(slices('hope and hope.', 'hope')).toEqual(['hope', 'hope']);
  });

  it('keeps punctuation and whitespace outside the word span', () => {
    const verse = '(Lord), "Lord"  and\tLord.';
    expect(slices(verse, 'lord')).toEqual(['Lord', 'Lord', 'Lord']);
    expect(verse.slice(1, 5)).toBe('Lord');
    expect(slices('hope  hope\nhope', 'hope')).toEqual(['hope', 'hope', 'hope']);
  });

  it('uses UTF-16 offsets and fails closed when lowercasing would move indexes', () => {
    const verse = '\u{1F4A7}Lord';
    const spans = findWholeWordOccurrences(verse, 'lord');
    expect(spans).toEqual([{ start: 2, end: 6 }]);
    expect(verse.slice(2, 6)).toBe('Lord');
    expect(findWholeWordOccurrences('İstanbul', 'istanbul')).toEqual([]);
    expect(findWholeWordOccurrences('Lord', '')).toEqual([]);
  });

  it('returns the same physical span for apostrophe variants', () => {
    const verse = 'the lord’s house';
    expect(findWholeWordOccurrences(verse, "lord's")).toEqual(findWholeWordOccurrences(verse, 'lord’s'));
    expect(findWholeWordOccurrences(verse, "lord's")).toHaveLength(1);
  });
});
