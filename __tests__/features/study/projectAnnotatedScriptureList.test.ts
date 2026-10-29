import type { Card } from '../../../src/features/flashcards/domain/card';
import type { StudyCurriculum } from '../../../src/features/flashcards/repositories/curriculumRepository';
import {
  projectAnnotatedScriptureList,
  type ScriptureListProblem,
} from '../../../src/features/study/domain/projectAnnotatedScriptureList';
import type { CurriculumSection } from '../../../src/features/season/domain/curriculumSection';

const SEASON = '2032';
const MATERIAL = 'material-junior';

function card(
  cardId: string,
  cardNumber: number,
  sectionId: string,
  reference: string,
  verseText: string,
  overrides: Partial<Card> = {},
): Card {
  return {
    seasonId: SEASON,
    materialSetId: MATERIAL,
    cardId,
    cardNumber,
    sectionId,
    reference,
    verseText,
    matchedRules: [],
    tags: [],
    annotations: [],
    ...overrides,
  };
}

function section(
  sectionId: string,
  title: string,
  displayOrder: number,
  cardIds: readonly string[],
  overrides: Partial<CurriculumSection> = {},
): CurriculumSection {
  return {
    seasonId: SEASON,
    materialSetId: MATERIAL,
    sectionId,
    title,
    displayOrder,
    cardIds,
    ...overrides,
  };
}

function curriculum(
  cards: readonly Card[],
  sections: readonly CurriculumSection[],
  overrides: Partial<StudyCurriculum> = {},
): StudyCurriculum {
  return {
    seasonId: SEASON,
    materialSetId: MATERIAL,
    title: 'Junior',
    cards,
    sections,
    ...overrides,
  };
}

function expectProblem(value: StudyCurriculum, problem: ScriptureListProblem): void {
  expect(projectAnnotatedScriptureList(value)).toEqual({ ok: false, problem });
}

describe('projectAnnotatedScriptureList', () => {
  it('orders sections by displayOrder', () => {
    const first = card('a', 2, 'late', 'John 3:16', 'Later verse.');
    const second = card('b', 1, 'early', 'Genesis 1:1', 'Earlier verse.');
    const value = curriculum(
      [first, second],
      [
        section('late', 'Later', 2, ['a']),
        section('early', 'Earlier', 1, ['b']),
      ],
    );

    const projection = projectAnnotatedScriptureList(value);
    expect(projection.ok).toBe(true);
    if (!projection.ok) {
      return;
    }
    expect(projection.sections.map((entry) => entry.section.sectionId)).toEqual(['early', 'late']);
    expect(projection.sections.map((entry) => entry.section.title)).toEqual(['Earlier', 'Later']);
  });

  it('breaks equal displayOrder by sectionId', () => {
    const value = curriculum(
      [card('a', 1, 'b-section', 'John 1:1', 'Bee.'), card('b', 2, 'a-section', 'Acts 1:1', 'Aye.')],
      [
        section('b-section', 'Bee title', 4, ['a']),
        section('a-section', 'Aye title', 4, ['b']),
      ],
    );
    const projection = projectAnnotatedScriptureList(value);
    expect(projection.ok).toBe(true);
    if (!projection.ok) {
      return;
    }
    expect(projection.sections.map((entry) => entry.section.sectionId)).toEqual([
      'a-section',
      'b-section',
    ]);
  });

  it('keeps section membership and cardIds order, including original card objects', () => {
    const john = card('john', 1, 'armor', 'John 3:16', 'John verse.');
    const genesis = card('genesis', 9, 'armor', 'Genesis 1:1', 'Genesis verse.');
    const acts = card('acts', 3, 'walk', 'Acts 1:8', 'Acts verse.');
    const value = curriculum(
      [john, genesis, acts],
      [
        section('armor', 'Armor', 1, ['genesis', 'john']),
        section('walk', 'Walk', 2, ['acts']),
      ],
    );

    const projection = projectAnnotatedScriptureList(value);
    expect(projection.ok).toBe(true);
    if (!projection.ok) {
      return;
    }
    expect(projection.sections[0]?.cards).toEqual([genesis, john]);
    expect(projection.sections[0]?.cards[0]).toBe(genesis);
    expect(projection.sections[0]?.cards[1]).toBe(john);
    expect(projection.sections[1]?.cards[0]).toBe(acts);
    expect(projection.sections[0]?.cards.map((item) => item.reference)).toEqual([
      'Genesis 1:1',
      'John 3:16',
    ]);
    expect(projection.sections.flatMap((entry) => entry.cards.map((item) => item.cardNumber))).toEqual([
      9, 1, 3,
    ]);
  });

  it('returns an empty projection for an empty curriculum', () => {
    expect(projectAnnotatedScriptureList(curriculum([], []))).toEqual({ ok: true, sections: [] });
  });

  it('keeps an official empty section without inventing cards', () => {
    const only = card('only', 4, 'full', 'Luke 2:1', 'Only verse.');
    const projection = projectAnnotatedScriptureList(
      curriculum(
        [only],
        [section('empty', 'Empty boundary', 1, []), section('full', 'Full', 2, ['only'])],
      ),
    );
    expect(projection.ok).toBe(true);
    if (!projection.ok) {
      return;
    }
    expect(projection.sections.map((entry) => entry.section.title)).toEqual([
      'Empty boundary',
      'Full',
    ]);
    expect(projection.sections[0]?.cards).toEqual([]);
    expect(projection.sections[1]?.cards).toEqual([only]);
    expect(JSON.stringify(projection)).not.toContain('Miscellaneous');
  });

  it('rejects an unknown card id instead of dropping it', () => {
    expectProblem(
      curriculum(
        [card('known', 1, 'armor', 'John 1:1', 'Known.')],
        [section('armor', 'Armor', 1, ['known', 'missing'])],
      ),
      'unknown-card-id',
    );
  });

  it('rejects duplicate card membership inside one section and across sections', () => {
    expectProblem(
      curriculum([card('a', 1, 'armor', 'John 1:1', 'Once.')], [section('armor', 'Armor', 1, ['a', 'a'])]),
      'duplicate-membership',
    );
    expectProblem(
      curriculum(
        [card('a', 1, 'armor', 'John 1:1', 'Once.')],
        [section('armor', 'Armor', 1, ['a']), section('other', 'Other', 2, ['a'])],
      ),
      'duplicate-membership',
    );
  });

  it('rejects a duplicate section id', () => {
    expectProblem(
      curriculum(
        [card('a', 1, 'armor', 'John 1:1', 'Once.')],
        [section('armor', 'Armor', 1, ['a']), section('armor', 'Again', 2, [])],
      ),
      'duplicate-section-id',
    );
  });

  it('rejects a card or section from another season or material set', () => {
    const local = card('a', 1, 'armor', 'John 1:1', 'Local verse.');
    expectProblem(
      curriculum(
        [local, card('foreign', 2, 'armor', 'Acts 1:1', 'Foreign verse.', { seasonId: '2033' })],
        [section('armor', 'Armor', 1, ['a'])],
      ),
      'foreign-card',
    );
    expectProblem(
      curriculum(
        [local, card('other-set', 2, 'armor', 'Acts 1:1', 'Other set.', { materialSetId: 'material-cadet' })],
        [section('armor', 'Armor', 1, ['a'])],
      ),
      'foreign-card',
    );
    expectProblem(
      curriculum(
        [local],
        [
          section('armor', 'Armor', 1, ['a']),
          section('abroad', 'Abroad', 2, [], { seasonId: '2033' }),
        ],
      ),
      'foreign-section',
    );
    expectProblem(
      curriculum(
        [local],
        [
          section('armor', 'Armor', 1, ['a']),
          section('abroad', 'Abroad', 2, [], { materialSetId: 'material-cadet' }),
        ],
      ),
      'foreign-section',
    );
  });

  it('rejects cards that are missing a section or omitted from section membership', () => {
    expectProblem(
      curriculum(
        [card('a', 1, 'missing', 'John 1:1', 'Orphan verse.')],
        [section('armor', 'Armor', 1, [])],
      ),
      'missing-section',
    );
    expectProblem(
      curriculum(
        [
          card('placed', 1, 'armor', 'John 1:1', 'Placed.'),
          card('omitted', 2, 'armor', 'Acts 1:1', 'Omitted.'),
        ],
        [section('armor', 'Armor', 1, ['placed'])],
      ),
      'incomplete-membership',
    );
    expectProblem(
      curriculum(
        [card('a', 1, 'other', 'John 1:1', 'Mismatch.')],
        [section('armor', 'Armor', 1, ['a']), section('other', 'Other', 2, [])],
      ),
      'section-mismatch',
    );
  });

  it('accounts for every card once and no card outside the curriculum', () => {
    const cards = [
      card('a', 1, 'one', 'John 1:1', 'One.'),
      card('b', 2, 'one', 'John 1:2', 'Two.'),
      card('c', 8, 'two', 'Acts 2:1', 'Three.'),
    ];
    const projection = projectAnnotatedScriptureList(
      curriculum(cards, [
        section('one', 'One', 1, ['b', 'a']),
        section('two', 'Two', 2, ['c']),
      ]),
    );
    expect(projection.ok).toBe(true);
    if (!projection.ok) {
      return;
    }
    const projected = projection.sections.flatMap((entry) => entry.cards);
    expect(projected).toHaveLength(cards.length);
    expect(new Set(projected.map((item) => item.cardId)).size).toBe(cards.length);
    expect(projected.map((item) => item.cardId).sort()).toEqual(['a', 'b', 'c']);
    expect(projected.every((item) => cards.includes(item))).toBe(true);
    expect(projected.some((item) => item.verseText === 'Not in the set.')).toBe(false);
  });

  it('does not mutate the curriculum', () => {
    const cards = [card('b', 2, 'armor', 'John 1:2', 'Second.'), card('a', 1, 'armor', 'John 1:1', 'First.')];
    const sections = [section('armor', 'Armor', 1, ['a', 'b'])];
    const value = curriculum(cards, sections);
    const before = JSON.stringify(value);
    Object.freeze(value);
    Object.freeze(value.cards);
    Object.freeze(value.sections);
    for (const item of value.cards) {
      Object.freeze(item);
      Object.freeze(item.annotations);
    }
    for (const item of value.sections) {
      Object.freeze(item);
      Object.freeze(item.cardIds);
    }

    const projection = projectAnnotatedScriptureList(value);
    expect(projection.ok).toBe(true);
    expect(JSON.stringify(value)).toBe(before);
    expect(value.cards.map((item) => item.cardId)).toEqual(['b', 'a']);
    expect(value.sections[0]?.cardIds).toEqual(['a', 'b']);
  });

  it('keeps the same card id and the same reference independent across material sets', () => {
    const sharedId = 'verse-1';
    const sharedReference = 'John 11:35';
    const juniorCard = card(sharedId, 4, 'armor', sharedReference, 'Junior words.', {
      annotations: [
        {
          annotationId: 'beg',
          cardId: sharedId,
          type: 'uniqueBeginning',
          sourceTarget: { strategy: 'phraseOccurrence' },
          resolvedTarget: { start: 0, end: 6 },
        },
      ],
    });
    const experiencedCard = card(sharedId, 20, 'walk', sharedReference, 'Experienced words.', {
      materialSetId: 'material-experienced',
      annotations: [
        {
          annotationId: 'freq',
          cardId: sharedId,
          type: 'frequency',
          sourceTarget: { strategy: 'phraseOccurrence' },
          resolvedTarget: { start: 0, end: 11 },
          frequencyTier: 3,
        },
      ],
    });
    const junior = projectAnnotatedScriptureList(
      curriculum([juniorCard], [section('armor', 'Armor', 1, [sharedId])]),
    );
    const experienced = projectAnnotatedScriptureList(
      curriculum(
        [experiencedCard],
        [section('walk', 'Walk', 1, [sharedId], { materialSetId: 'material-experienced' })],
        { materialSetId: 'material-experienced', title: 'Experienced' },
      ),
    );

    expect(junior.ok && experienced.ok).toBe(true);
    if (!junior.ok || !experienced.ok) {
      return;
    }
    const left = junior.sections[0]?.cards[0];
    const right = experienced.sections[0]?.cards[0];
    expect(left).toBe(juniorCard);
    expect(right).toBe(experiencedCard);
    expect(left?.cardId).toBe(right?.cardId);
    expect(left?.reference).toBe(sharedReference);
    expect(right?.reference).toBe(sharedReference);
    expect(left?.verseText).toBe('Junior words.');
    expect(right?.verseText).toBe('Experienced words.');
    expect(left?.annotations).toBe(juniorCard.annotations);
    expect(right?.annotations).toBe(experiencedCard.annotations);
    expect(left?.annotations).not.toBe(right?.annotations);
  });

  it('supports a one-card section and a many-card section in cardIds order', () => {
    const many = ['c', 'a', 'e', 'b', 'd'].map((cardId, index) =>
      card(
        cardId,
        index + 10,
        'many',
        `Ref ${cardId}`,
        `${cardId} verse text that is not sorted by reference.`,
      ),
    );
    const single = card('only', 50, 'single', 'Psalm 23:1', 'Shepherd.');
    const projection = projectAnnotatedScriptureList(
      curriculum(
        [...many, single],
        [
          section('many', 'Many', 1, ['c', 'a', 'e', 'b', 'd']),
          section('single', 'Single', 2, ['only']),
        ],
      ),
    );
    expect(projection.ok).toBe(true);
    if (!projection.ok) {
      return;
    }
    expect(projection.sections[0]?.cards.map((item) => item.cardId)).toEqual(['c', 'a', 'e', 'b', 'd']);
    expect(projection.sections[0]?.cards).toHaveLength(5);
    expect(projection.sections[1]?.cards).toEqual([single]);
    expect(projection.sections[1]?.cards[0]?.cardNumber).toBe(50);
    expect(projection.sections[1]?.cards[0]?.reference).toBe('Psalm 23:1');
  });

  it('rejects a duplicate card id inside one material set', () => {
    const first = card('a', 1, 'armor', 'John 1:1', 'First copy.');
    const second = card('a', 2, 'armor', 'John 1:2', 'Second copy.');
    expectProblem(
      curriculum([first, second], [section('armor', 'Armor', 1, ['a'])]),
      'duplicate-card-id',
    );
  });
});
