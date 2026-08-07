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

  it('matches keyword tier tags and rule names', () => {
    const withTag = verse({ id: 'k1', tags: ['1x Keyword'] });
    const withRule = verse({
      id: 'k2',
      tags: [],
      matched_rules: [
        {
          rule_name: '2x Keyword',
          rule_category: 'Index',
          notes: "Words marked as 2x frequency: 'census'",
        },
      ],
    });
    const threeX = verse({ id: 'k3', tags: ['3x Keyword'] });

    expect(verseMatchesCategory(withTag, 'keyword1x')).toBe(true);
    expect(verseMatchesCategory(withTag, 'keyword2x')).toBe(false);
    expect(verseMatchesCategory(withRule, 'keyword2x')).toBe(true);
    expect(verseMatchesCategory(threeX, 'keyword3x')).toBe(true);
  });

  it('matches semantic category tags and rule names', () => {
    const animals = verse({ id: 'a1', tags: ['Animals'] });
    const proper = verse({
      id: 'p1',
      tags: [],
      matched_rules: [
        {
          rule_name: 'Proper Name',
          rule_category: 'Index',
          notes: "Names: 'Caesar'",
        },
      ],
    });
    const body = verse({ id: 'b1', tags: ['Body Parts'] });
    const geo = verse({ id: 'g1', tags: ['Geo Location'] });

    expect(verseMatchesCategory(animals, 'animals')).toBe(true);
    expect(verseMatchesCategory(proper, 'properName')).toBe(true);
    expect(verseMatchesCategory(body, 'bodyParts')).toBe(true);
    expect(verseMatchesCategory(geo, 'geoLocation')).toBe(true);
    expect(verseMatchesCategory(animals, 'properName')).toBe(false);
  });
});

describe('filterVersesByCategory', () => {
  const verses = [
    verse({ id: 'v1', tags: ['Unique Beg.'] }),
    verse({ id: 'v2', tags: ['Unique End.'] }),
    verse({ id: 'v3', tags: ['Questions', '1x Keyword'] }),
    verse({ id: 'v4', tags: ['Animals', 'Proper Name'] }),
    verse({ id: 'v5', tags: ['2x Keyword', 'Geo Location'] }),
    verse({ id: 'v6', tags: ['Body Parts', '3x Keyword'] }),
  ];

  it('returns the full list when no filters are selected', () => {
    expect(filterVersesByCategory(verses, []).map((item) => item.id)).toEqual([
      'v1',
      'v2',
      'v3',
      'v4',
      'v5',
      'v6',
    ]);
  });

  it('unions multiple selected filters', () => {
    expect(
      filterVersesByCategory(verses, ['uniqueBeginning', 'question']).map((item) => item.id),
    ).toEqual(['v1', 'v3']);
  });

  it('filters keyword and semantic categories', () => {
    expect(
      filterVersesByCategory(verses, ['keyword1x', 'animals', 'bodyParts']).map(
        (item) => item.id,
      ),
    ).toEqual(['v3', 'v4', 'v6']);

    expect(
      filterVersesByCategory(verses, ['keyword2x', 'geoLocation']).map((item) => item.id),
    ).toEqual(['v5']);
  });
});
