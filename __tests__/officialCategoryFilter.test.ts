import type { Card } from '../src/features/flashcards/domain/card';
import { buildStudyCards } from '../src/features/flashcards/utils/buildStudyCards';
import {
  cardMatchesCategory,
  filterCardsByCategory,
} from '../src/features/flashcards/utils/filterCardsByCategory';
import { applicableOfficialMarks } from '../src/shared/scripture/segmentOfficialAnnotations';
import {
  officialAnnotation,
  officialAnnotationWithTier,
  officialStudyCard,
} from '../test-utils/officialFlashcardFixtures';

function markedCard(
  cardId: string,
  annotations: Card['annotations'],
  overrides: Partial<Card> = {},
): Card {
  return officialStudyCard({
    cardId,
    cardNumber: Number(cardId.replace(/\D/g, '')) || 1,
    reference: `Ref ${cardId}`,
    verseText: 'Alpha walks.',
    annotations,
    ...overrides,
  });
}

function beginning(cardId: string, annotationId = `${cardId}-beg`) {
  return officialAnnotation({
    cardId,
    annotationId,
    type: 'uniqueBeginning',
    start: 0,
    end: 5,
  });
}

function ending(cardId: string, annotationId = `${cardId}-end`) {
  return officialAnnotation({
    cardId,
    annotationId,
    type: 'uniqueEnding',
    start: 6,
    end: 11,
  });
}

function frequency(cardId: string, tier: number, annotationId = `${cardId}-f${tier}`) {
  return officialAnnotation({
    cardId,
    annotationId,
    type: 'frequency',
    start: 6,
    end: 11,
    frequencyTier: tier,
  });
}

describe('official category filters', () => {
  it('matches unique beginnings from annotations when legacy tags are absent', () => {
    const cards = Array.from({ length: 50 }, (_, index) => {
      const cardId = `c${index + 1}`;
      return markedCard(cardId, [beginning(cardId)], {
        cardNumber: index + 1,
        materialSetId: 'cadet-2027',
        tags: [],
        matchedRules: [],
      });
    });

    expect(filterCardsByCategory(cards, ['uniqueBeginning']).map((card) => card.cardId)).toEqual(
      [],
    );
    expect(filterCardsByCategory(cards, ['uniqueBeginning'], 'official')).toHaveLength(50);
    expect(cards.every((card) => card.tags.length === 0)).toBe(true);
  });

  it('matches unique endings and each frequency tier from painted annotations', () => {
    const cards = [
      markedCard('beg', [beginning('beg')]),
      markedCard('end', [ending('end')]),
      markedCard('f1', [frequency('f1', 1)]),
      markedCard('f2', [frequency('f2', 2)]),
      markedCard('f3', [frequency('f3', 3)]),
      markedCard('f4', [frequency('f4', 4)]),
      markedCard('f5', [frequency('f5', 5)]),
    ];

    expect(filterCardsByCategory(cards, ['uniqueEnding'], 'official').map((card) => card.cardId)).toEqual([
      'end',
    ]);
    expect(filterCardsByCategory(cards, ['frequency1x'], 'official').map((card) => card.cardId)).toEqual([
      'f1',
    ]);
    expect(filterCardsByCategory(cards, ['frequency2x'], 'official').map((card) => card.cardId)).toEqual([
      'f2',
    ]);
    expect(filterCardsByCategory(cards, ['frequency3x'], 'official').map((card) => card.cardId)).toEqual([
      'f3',
    ]);
    expect(filterCardsByCategory(cards, ['frequency4x'], 'official').map((card) => card.cardId)).toEqual([
      'f4',
    ]);
    expect(filterCardsByCategory(cards, ['frequency5x'], 'official').map((card) => card.cardId)).toEqual([
      'f5',
    ]);
  });

  it('keeps one card when several official categories overlap', () => {
    const card = markedCard('both', [beginning('both'), frequency('both', 4)]);
    const cards = [card, markedCard('other', [ending('other')])];
    const selected = filterCardsByCategory(
      cards,
      ['uniqueBeginning', 'frequency4x'],
      'official',
    );

    expect(selected.map((item) => item.cardId)).toEqual(['both']);
    expect(selected[0]).toBe(card);
    expect(cardMatchesCategory(card, 'uniqueBeginning', 'official')).toBe(true);
    expect(cardMatchesCategory(card, 'frequency4x', 'official')).toBe(true);
  });

  it('ignores filters this presentation does not offer', () => {
    const cards = [
      markedCard('beg', [beginning('beg')], { tags: ['Animals'] }),
      markedCard('plain', []),
    ];

    expect(filterCardsByCategory(cards, ['animals'], 'official').map((card) => card.cardId)).toEqual([
      'beg',
      'plain',
    ]);
    expect(cardMatchesCategory(cards[0]!, 'animals', 'official')).toBe(false);
    expect(filterCardsByCategory(cards, ['animals', 'uniqueBeginning'], 'official').map((card) => card.cardId)).toEqual([
      'beg',
    ]);
    expect(filterCardsByCategory(cards, [], 'official').map((card) => card.cardId)).toEqual([
      'beg',
      'plain',
    ]);
    expect(filterCardsByCategory(cards, ['frequency1x'], 'legacy')).toHaveLength(2);
  });

  it('does not match malformed, duplicate, conflicting, or foreign annotations', () => {
    const wrongCard = markedCard('owner', [
      officialAnnotation({
        cardId: 'someone-else',
        annotationId: 'foreign',
        type: 'uniqueBeginning',
        start: 0,
        end: 5,
      }),
    ]);
    const duplicate = markedCard('dup', [
      beginning('dup', 'same'),
      beginning('dup', 'same'),
    ]);
    const missingTier = markedCard('missing', [
      officialAnnotation({
        cardId: 'missing',
        annotationId: 'no-tier',
        type: 'frequency',
        start: 6,
        end: 11,
      }),
    ]);
    const invalidTier = markedCard('bad-tier', [
      officialAnnotationWithTier(
        {
          cardId: 'bad-tier',
          annotationId: 'tier-9',
          type: 'frequency',
          start: 6,
          end: 11,
        },
        9,
      ),
    ]);
    const conflict = markedCard('conflict', [
      officialAnnotation({
        cardId: 'conflict',
        annotationId: 'low',
        type: 'frequency',
        start: 0,
        end: 5,
        frequencyTier: 1,
      }),
      officialAnnotation({
        cardId: 'conflict',
        annotationId: 'high',
        type: 'frequency',
        start: 0,
        end: 5,
        frequencyTier: 2,
      }),
      beginning('conflict', 'still-beginning'),
    ]);
    const unsupported = markedCard('other-type', [
      officialAnnotation({
        cardId: 'other-type',
        annotationId: 'note',
        type: 'animals',
        start: 0,
        end: 5,
      }),
    ]);
    const empty = markedCard('empty', []);
    const missingAnnotations = officialStudyCard({
      cardId: 'none',
      reference: 'Ref none',
      verseText: 'Alpha walks.',
      annotations: undefined,
    });

    expect(cardMatchesCategory(wrongCard, 'uniqueBeginning', 'official')).toBe(false);
    expect(cardMatchesCategory(duplicate, 'uniqueBeginning', 'official')).toBe(false);
    expect(cardMatchesCategory(missingTier, 'frequency2x', 'official')).toBe(false);
    expect(cardMatchesCategory(invalidTier, 'frequency1x', 'official')).toBe(false);
    expect(cardMatchesCategory(invalidTier, 'frequency5x', 'official')).toBe(false);
    expect(cardMatchesCategory(conflict, 'frequency1x', 'official')).toBe(false);
    expect(cardMatchesCategory(conflict, 'frequency2x', 'official')).toBe(false);
    expect(cardMatchesCategory(conflict, 'uniqueBeginning', 'official')).toBe(true);
    expect(cardMatchesCategory(unsupported, 'uniqueBeginning', 'official')).toBe(false);
    expect(cardMatchesCategory(empty, 'uniqueBeginning', 'official')).toBe(false);
    expect(cardMatchesCategory(missingAnnotations, 'uniqueEnding', 'official')).toBe(false);

    const conflictMarks = applicableOfficialMarks({
      verseText: conflict.verseText,
      annotations: conflict.annotations,
      cardId: conflict.cardId,
    });
    expect(conflictMarks.frequencyTiers).toEqual([]);
    expect(conflictMarks.uniqueBeginning).toBe(true);
  });

  it('does not scan scripture text or legacy tags while in official mode', () => {
    const card = officialStudyCard({
      cardId: 'words',
      reference: 'Ref words',
      verseText: 'Animals question exclamation.',
      tags: ['Unique Beg.', '1x Keyword'],
      matchedRules: [
        { ruleName: 'Unique Ending', ruleCategory: 'Structural', notes: '' },
      ],
      annotations: [],
    });

    expect(cardMatchesCategory(card, 'animals', 'official')).toBe(false);
    expect(cardMatchesCategory(card, 'uniqueBeginning', 'official')).toBe(false);
    expect(cardMatchesCategory(card, 'uniqueEnding', 'official')).toBe(false);
    expect(cardMatchesCategory(card, 'keyword1x', 'official')).toBe(false);
    expect(cardMatchesCategory(card, 'uniqueBeginning', 'legacy')).toBe(true);
    expect(cardMatchesCategory(card, 'uniqueEnding', 'legacy')).toBe(true);
    expect(cardMatchesCategory(card, 'keyword1x', 'legacy')).toBe(true);
  });

  it('keeps the same scripture reference independent across MaterialSets', () => {
    const sharedReference = 'John 11:35';
    const cadet = markedCard('c1', [beginning('c1')], {
      materialSetId: 'cadet-2027',
      reference: sharedReference,
      verseText: 'Alpha walks.',
    });
    const beginner = markedCard('c1', [frequency('c1', 3)], {
      materialSetId: 'beginner-2027',
      reference: sharedReference,
      verseText: 'Beta speaks today.',
      annotations: [
        officialAnnotation({
          cardId: 'c1',
          annotationId: 'beginner-tier',
          type: 'frequency',
          start: 0,
          end: 4,
          frequencyTier: 3,
        }),
      ],
    });

    const cadetMatches = filterCardsByCategory([cadet], ['uniqueBeginning'], 'official');
    const beginnerMatches = filterCardsByCategory([beginner], ['frequency3x'], 'official');

    expect(cadetMatches).toEqual([cadet]);
    expect(beginnerMatches).toEqual([beginner]);
    expect(filterCardsByCategory([cadet], ['frequency3x'], 'official')).toEqual([]);
    expect(cadet.verseText).toBe('Alpha walks.');
    expect(beginner.verseText).toBe('Beta speaks today.');
    expect(cadet.annotations).toBe(cadetMatches[0]?.annotations);
  });

  it('preserves order, unions filters, and shuffles only the filtered scope', () => {
    const cards = [
      markedCard('a', [beginning('a')]),
      markedCard('b', [frequency('b', 2)]),
      markedCard('c', [ending('c')]),
      markedCard('d', [beginning('d'), frequency('d', 2)]),
    ];
    const before = cards.map((card) => ({
      verseText: card.verseText,
      annotations: card.annotations,
    }));

    expect(filterCardsByCategory(cards, [], 'official').map((card) => card.cardId)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
    expect(
      filterCardsByCategory(cards, ['uniqueBeginning', 'frequency2x'], 'official').map(
        (card) => card.cardId,
      ),
    ).toEqual(['a', 'b', 'd']);
    expect(filterCardsByCategory(cards, ['frequency5x'], 'official')).toEqual([]);
    expect(cards.map((card) => ({ verseText: card.verseText, annotations: card.annotations }))).toEqual(
      before,
    );

    const shuffled = buildStudyCards(
      cards,
      { categoryFilters: ['uniqueBeginning', 'frequency2x'], shuffleCards: true },
      'official',
    );
    expect(shuffled.map((card) => card.cardId).sort()).toEqual(['a', 'b', 'd']);
    expect(new Set(shuffled.map((card) => card.cardId)).size).toBe(3);
  });
});
