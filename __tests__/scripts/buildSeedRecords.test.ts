import mockVerseData from '../../src/data/mock-verse-data.json';
import type { FixtureCardRecord } from '../../src/features/flashcards/data/fixtureCardRecord';
import {
  buildFirestoreCardSeedRecords,
  SeedValidationError,
} from '../../scripts/firestore-seed/buildSeedRecords';

const fixtures = mockVerseData as FixtureCardRecord[];

describe('buildFirestoreCardSeedRecords', () => {
  it('maps the JSON fixture to Firestore Card documents with ordered card_number', () => {
    const records = buildFirestoreCardSeedRecords(fixtures);

    expect(records).toHaveLength(9);
    expect(records.map((record) => record.cardId)).toEqual([
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
    expect(records.map((record) => record.document.card_number)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });

  it('preserves fixture fields and omits path identity from the document', () => {
    const [first] = buildFirestoreCardSeedRecords(fixtures);

    expect(first.document).toEqual({
      card_number: 1,
      reference: fixtures[0].reference,
      verse_text: fixtures[0].verse_text,
      index_code: fixtures[0].index_code,
      matched_rules: fixtures[0].matched_rules,
      tags: fixtures[0].tags,
    });
    expect(first.document).not.toHaveProperty('seasonId');
    expect(first.document).not.toHaveProperty('cardId');
    expect(first.document).not.toHaveProperty('id');
  });

  it('rejects missing, duplicate, or malformed fixture data', () => {
    expect(() => buildFirestoreCardSeedRecords([])).toThrow(SeedValidationError);
    expect(() =>
      buildFirestoreCardSeedRecords([{ ...fixtures[0], id: '' }]),
    ).toThrow(/id/);
    expect(() =>
      buildFirestoreCardSeedRecords([fixtures[0], { ...fixtures[1], id: fixtures[0].id }]),
    ).toThrow(/Duplicate fixture id/);
    expect(() =>
      buildFirestoreCardSeedRecords([{ ...fixtures[0], verse_text: '   ' }]),
    ).toThrow(/verse_text/);
    expect(() =>
      buildFirestoreCardSeedRecords([{ ...fixtures[0], tags: ['ok', 1] as unknown as string[] }]),
    ).toThrow(/tags/);
  });
});
