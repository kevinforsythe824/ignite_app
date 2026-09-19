import { getDivisionLabel, type DivisionId } from '../../src/features/season/domain/division';
import {
  CONTENT_SCHEMA_VERSION,
  PHRASE_OCCURRENCE_STRATEGY,
  SYNTHETIC_DATASET_LABEL,
  SYNTHETIC_SEASON_END_DATE,
  SYNTHETIC_SEASON_ID,
  SYNTHETIC_SEASON_NAME,
  SYNTHETIC_SEASON_START_DATE,
  SYNTHETIC_SOURCE_VERSION,
} from './constants';
import type { AuthoringWorkbookData } from './types';

/**
 * Fabricated DEV Scripture. Not official WPF / Board material.
 * Book name SynTest exists only so tests can exercise references, length,
 * repeated phrases, and independent MaterialSet copies of the same reference.
 */
export const SYNTHETIC_VERSES = {
  short: {
    reference: 'SynTest 1:1',
    verseText: 'Light shines.',
  },
  repeatedWord: {
    reference: 'SynTest 1:2',
    verseText: 'the word was spoken and the word was heard and the word remained.',
  },
  repeatedHope: {
    reference: 'SynTest 1:3',
    verseText: 'Hope grows in quiet fields where hope is planted and hope is watered.',
  },
  long: {
    reference: 'SynTest 2:1',
    verseText:
      'A long fabricated study line remains here so the pipeline can store extended Scripture without treating it as official material. Peace covers the valley and peace covers the hill and peace remains overnight.',
  },
  uniqueStart: {
    reference: 'SynTest 3:1',
    verseText: 'Alpha begins the saying.',
  },
  uniqueEnd: {
    reference: 'SynTest 3:2',
    verseText: 'The saying finishes omega.',
  },
  frequency: {
    reference: 'SynTest 4:1',
    verseText: 'count the stars, count the stars, then rest.',
  },
} as const;

function packageRow() {
  return {
    seasonId: SYNTHETIC_SEASON_ID,
    name: SYNTHETIC_SEASON_NAME,
    startDate: SYNTHETIC_SEASON_START_DATE,
    endDate: SYNTHETIC_SEASON_END_DATE,
    status: 'draft',
    sourceVersion: SYNTHETIC_SOURCE_VERSION,
    schemaVersion: CONTENT_SCHEMA_VERSION,
  };
}

function materialSetRow(divisionId: DivisionId) {
  return {
    seasonId: SYNTHETIC_SEASON_ID,
    materialSetId: divisionId,
    divisionId,
    displayName: `${getDivisionLabel(divisionId)} — ${SYNTHETIC_DATASET_LABEL}`,
  };
}

export function buildSyntheticWorkbook(divisionId: DivisionId): AuthoringWorkbookData {
  switch (divisionId) {
    case 'cadet':
      return cadetWorkbook();
    case 'beginner':
      return beginnerWorkbook();
    case 'junior':
      return juniorWorkbook();
    case 'intermediate':
      return intermediateWorkbook();
    case 'experienced':
      return experiencedWorkbook();
  }
}

export function buildAllSyntheticWorkbooks(): AuthoringWorkbookData[] {
  return [
    buildSyntheticWorkbook('cadet'),
    buildSyntheticWorkbook('beginner'),
    buildSyntheticWorkbook('junior'),
    buildSyntheticWorkbook('intermediate'),
    buildSyntheticWorkbook('experienced'),
  ];
}

function cadetWorkbook(): AuthoringWorkbookData {
  return {
    workbookName: `${SYNTHETIC_SEASON_ID}-cadet.xlsx`,
    package: packageRow(),
    materialSet: materialSetRow('cadet'),
    sections: [
      { sectionId: 'unit-1', title: 'Unit 1', displayOrder: 1, description: 'Opening synthetic unit' },
      { sectionId: 'unit-2', title: 'Unit 2', displayOrder: 2 },
    ],
    cards: [
      {
        cardNumber: 1,
        cardId: 'c1',
        reference: SYNTHETIC_VERSES.short.reference,
        verseText: SYNTHETIC_VERSES.short.verseText,
        sectionId: 'unit-1',
        tags: 'short,shared-ref',
      },
      {
        cardNumber: 2,
        cardId: 'c2',
        reference: SYNTHETIC_VERSES.repeatedWord.reference,
        verseText: SYNTHETIC_VERSES.repeatedWord.verseText,
        sectionId: 'unit-1',
        tags: 'repeated',
      },
      {
        cardNumber: 3,
        reference: SYNTHETIC_VERSES.repeatedHope.reference,
        verseText: SYNTHETIC_VERSES.repeatedHope.verseText,
        sectionId: 'unit-2',
      },
    ],
    annotations: [
      {
        cardId: 'c1',
        type: 'keyword',
        strategy: PHRASE_OCCURRENCE_STRATEGY,
        phrase: 'Light',
        occurrenceIndex: 1,
        notes: 'SYNTHETIC keyword',
      },
      {
        cardNumber: 2,
        type: 'highlight',
        strategy: PHRASE_OCCURRENCE_STRATEGY,
        phrase: 'the word',
        occurrenceIndex: 2,
        notes: 'Second occurrence of a repeated phrase',
      },
    ],
    quizMetadata: [],
    crossReferences: [],
  };
}

function beginnerWorkbook(): AuthoringWorkbookData {
  return {
    workbookName: `${SYNTHETIC_SEASON_ID}-beginner.xlsx`,
    package: packageRow(),
    materialSet: materialSetRow('beginner'),
    sections: [
      { sectionId: 'unit-a', title: 'Unit A', displayOrder: 1 },
      { sectionId: 'unit-b', title: 'Unit B', displayOrder: 2 },
    ],
    cards: [
      {
        cardNumber: 10,
        cardId: 'c1',
        reference: SYNTHETIC_VERSES.short.reference,
        verseText: SYNTHETIC_VERSES.short.verseText,
        sectionId: 'unit-a',
        tags: 'shared-ref',
      },
      {
        cardNumber: 11,
        cardId: 'c2',
        reference: SYNTHETIC_VERSES.repeatedWord.reference,
        verseText: SYNTHETIC_VERSES.repeatedWord.verseText,
        sectionId: 'unit-a',
      },
      {
        cardNumber: 12,
        cardId: 'c4',
        reference: SYNTHETIC_VERSES.long.reference,
        verseText: SYNTHETIC_VERSES.long.verseText,
        sectionId: 'unit-b',
        tags: 'long',
      },
    ],
    annotations: [
      {
        cardId: 'c1',
        type: 'underline',
        strategy: PHRASE_OCCURRENCE_STRATEGY,
        phrase: 'shines',
        occurrenceIndex: 1,
      },
      {
        cardId: 'c2',
        type: 'highlight',
        strategy: PHRASE_OCCURRENCE_STRATEGY,
        phrase: 'the word',
        occurrenceIndex: 1,
      },
    ],
    quizMetadata: [
      { cardId: 'c4', pointValue: 10, questionHint: 'SYNTHETIC long-verse practice hint' },
    ],
    crossReferences: [],
  };
}

function juniorWorkbook(): AuthoringWorkbookData {
  return {
    workbookName: `${SYNTHETIC_SEASON_ID}-junior.xlsx`,
    package: packageRow(),
    materialSet: materialSetRow('junior'),
    sections: [{ sectionId: 'part-1', title: 'Part 1', displayOrder: 1 }],
    cards: [
      {
        cardNumber: 5,
        cardId: 'c1',
        reference: SYNTHETIC_VERSES.short.reference,
        verseText: SYNTHETIC_VERSES.short.verseText,
        sectionId: 'part-1',
      },
      {
        cardNumber: 6,
        cardId: 'c10',
        reference: SYNTHETIC_VERSES.uniqueStart.reference,
        verseText: SYNTHETIC_VERSES.uniqueStart.verseText,
        sectionId: 'part-1',
      },
      {
        cardNumber: 7,
        cardId: 'c11',
        reference: SYNTHETIC_VERSES.uniqueEnd.reference,
        verseText: SYNTHETIC_VERSES.uniqueEnd.verseText,
        sectionId: 'part-1',
      },
    ],
    annotations: [
      {
        cardId: 'c10',
        type: 'uniqueBeginning',
        strategy: PHRASE_OCCURRENCE_STRATEGY,
        phrase: 'Alpha begins',
        occurrenceIndex: 1,
        notes: 'SYNTHETIC unique beginning — not official notation',
      },
      {
        cardId: 'c11',
        type: 'uniqueEnding',
        strategy: PHRASE_OCCURRENCE_STRATEGY,
        phrase: 'finishes omega',
        occurrenceIndex: 1,
        notes: 'SYNTHETIC unique ending — not official notation',
      },
      {
        cardId: 'c1',
        type: 'crossReference',
        strategy: PHRASE_OCCURRENCE_STRATEGY,
        phrase: 'Light',
        occurrenceIndex: 1,
      },
    ],
    quizMetadata: [{ cardNumber: 5, questionHint: 'SYNTHETIC junior hint' }],
    crossReferences: [
      {
        fromCardId: 'c1',
        toCardId: 'c10',
        toReference: SYNTHETIC_VERSES.uniqueStart.reference,
        notes: 'SYNTHETIC cross-reference',
      },
    ],
  };
}

function intermediateWorkbook(): AuthoringWorkbookData {
  return {
    workbookName: `${SYNTHETIC_SEASON_ID}-intermediate.xlsx`,
    package: packageRow(),
    materialSet: materialSetRow('intermediate'),
    sections: [
      { sectionId: 'block-1', title: 'Block 1', displayOrder: 1 },
      { sectionId: 'block-2', title: 'Block 2', displayOrder: 2 },
    ],
    cards: [
      {
        cardNumber: 20,
        cardId: 'c1',
        reference: SYNTHETIC_VERSES.short.reference,
        verseText: SYNTHETIC_VERSES.short.verseText,
        sectionId: 'block-1',
      },
      {
        cardNumber: 21,
        cardId: 'c20',
        reference: SYNTHETIC_VERSES.frequency.reference,
        verseText: SYNTHETIC_VERSES.frequency.verseText,
        sectionId: 'block-1',
      },
      {
        cardNumber: 22,
        cardId: 'c21',
        reference: SYNTHETIC_VERSES.repeatedWord.reference,
        verseText: SYNTHETIC_VERSES.repeatedWord.verseText,
        sectionId: 'block-2',
      },
    ],
    annotations: [
      {
        cardId: 'c20',
        type: 'frequency',
        strategy: PHRASE_OCCURRENCE_STRATEGY,
        phrase: 'count the stars',
        occurrenceIndex: 1,
        notes: 'SYNTHETIC frequency placeholder',
      },
      {
        cardId: 'c20',
        type: 'frequency',
        strategy: PHRASE_OCCURRENCE_STRATEGY,
        phrase: 'count the stars',
        occurrenceIndex: 2,
      },
      {
        cardId: 'c21',
        type: 'highlight',
        strategy: PHRASE_OCCURRENCE_STRATEGY,
        phrase: 'the word',
        occurrenceIndex: 3,
      },
      {
        cardId: 'c21',
        type: 'underline',
        strategy: PHRASE_OCCURRENCE_STRATEGY,
        phrase: 'spoken',
        occurrenceIndex: 1,
      },
    ],
    quizMetadata: [],
    crossReferences: [],
  };
}

function experiencedWorkbook(): AuthoringWorkbookData {
  return {
    workbookName: `${SYNTHETIC_SEASON_ID}-experienced.xlsx`,
    package: packageRow(),
    materialSet: materialSetRow('experienced'),
    sections: [
      { sectionId: 'set-a', title: 'Set A', displayOrder: 1 },
      { sectionId: 'set-b', title: 'Set B', displayOrder: 2 },
    ],
    cards: [
      {
        cardNumber: 100,
        cardId: 'c1',
        reference: SYNTHETIC_VERSES.short.reference,
        verseText: SYNTHETIC_VERSES.short.verseText,
        sectionId: 'set-a',
        indexCode: 'SYN-A',
      },
      {
        cardNumber: 101,
        cardId: 'c30',
        reference: SYNTHETIC_VERSES.long.reference,
        verseText: SYNTHETIC_VERSES.long.verseText,
        sectionId: 'set-a',
      },
      {
        cardNumber: 102,
        cardId: 'c31',
        reference: SYNTHETIC_VERSES.repeatedHope.reference,
        verseText: SYNTHETIC_VERSES.repeatedHope.verseText,
        sectionId: 'set-b',
      },
    ],
    annotations: [
      {
        cardId: 'c30',
        type: 'highlight',
        strategy: PHRASE_OCCURRENCE_STRATEGY,
        phrase: 'Peace',
        occurrenceIndex: 1,
      },
      {
        cardId: 'c30',
        type: 'underline',
        strategy: PHRASE_OCCURRENCE_STRATEGY,
        phrase: 'peace',
        occurrenceIndex: 1,
      },
      {
        cardId: 'c31',
        type: 'keyword',
        strategy: PHRASE_OCCURRENCE_STRATEGY,
        phrase: 'Hope',
        occurrenceIndex: 1,
      },
    ],
    quizMetadata: [{ cardId: 'c30', pointValue: 20, questionHint: 'SYNTHETIC experienced hint' }],
    crossReferences: [
      {
        fromCardNumber: 100,
        toReference: SYNTHETIC_VERSES.long.reference,
        toCardId: 'c30',
        notes: 'SYNTHETIC experienced cross-ref',
      },
    ],
  };
}
