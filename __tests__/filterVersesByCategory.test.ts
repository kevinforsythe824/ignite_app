import {
  filterVersesByCategory,
  verseMatchesCategory,
} from '../src/features/flashcards/utils/filterVersesByCategory';
import type { Verse } from '../src/features/flashcards/types/verse';

function verse(partial: Partial<Verse> & Pick<Verse, 'id' | 'tags'>): Verse {
  return {
    reference: 'Test 1:1',
    verse_text: 'Sample.',
    index_code: '001',
    matched_rules: [],
    ...partial,
  };
}

describe('verseMatchesCategory', () => {
  it('matches Unique Beg. tags and rule names', () => {
    const withTag = verse({ id: 'a', tags: ['Unique Beg.'] });
    const withRule = verse({
      id: 'b',
      tags: [],
      matched_rules: [
        {
          rule_name: 'Unique Beginning',
          rule_category: 'Structural',
          notes: 'n/a',
        },
      ],
    });

    expect(verseMatchesCategory(withTag, 'uniqueBeginning')).toBe(true);
    expect(verseMatchesCategory(withRule, 'uniqueBeginning')).toBe(true);
    expect(verseMatchesCategory(withTag, 'uniqueEnding')).toBe(false);
  });

  it('matches Questions and Exclamations labels', () => {
    const question = verse({ id: 'q', tags: ['Questions'] });
    const exclamation = verse({ id: 'e', tags: ['Exclamation'] });

    expect(verseMatchesCategory(question, 'question')).toBe(true);
    expect(verseMatchesCategory(exclamation, 'exclamation')).toBe(true);
  });
});

describe('filterVersesByCategory', () => {
  const verses = [
    verse({ id: 'v1', tags: ['Unique Beg.'] }),
    verse({ id: 'v2', tags: ['Unique End.'] }),
    verse({ id: 'v3', tags: ['Questions', '1x Keyword'] }),
  ];

  it('returns the full list when no filters are selected', () => {
    expect(filterVersesByCategory(verses, []).map((item) => item.id)).toEqual([
      'v1',
      'v2',
      'v3',
    ]);
  });

  it('unions multiple selected filters', () => {
    expect(
      filterVersesByCategory(verses, ['uniqueBeginning', 'question']).map((item) => item.id),
    ).toEqual(['v1', 'v3']);
  });
});
