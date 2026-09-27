import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, setDoc, type Firestore } from 'firebase/firestore';
import { resolve } from 'path';

import { createFirebaseCurriculumSource } from '../../src/features/flashcards/repositories/firebaseCurriculumSource';
import { UnknownMaterialSetError } from '../../src/features/flashcards/repositories/curriculumRepository';
import { FirestoreCurriculumRepository } from '../../src/features/flashcards/repositories/firestoreCurriculumRepository';

/** Emulator-only. Not a DEV, staging, or production Firebase project. */
const PROJECT_ID = 'ignite-curriculum-repo-test';
const RULES_PATH = resolve(__dirname, '../../firestore.rules');
const USER_ID = 'curriculum-repo-emulator-user';

const SEASON_ID = 'synth-curriculum-season';
const ALPHA_SET_ID = 'set-alpha';
const BETA_SET_ID = 'set-beta';
const EMPTY_SET_ID = 'set-empty';
const SHARED_REFERENCE = 'Book 1:1';

function seasonPath(): string {
  return `seasons/${SEASON_ID}`;
}

function materialSetPath(materialSetId: string): string {
  return `${seasonPath()}/materialSets/${materialSetId}`;
}

function sectionPath(materialSetId: string, sectionId: string): string {
  return `${materialSetPath(materialSetId)}/sections/${sectionId}`;
}

function cardPath(materialSetId: string, cardId: string): string {
  return `${materialSetPath(materialSetId)}/cards/${cardId}`;
}

describe('Firestore curriculum repository emulator', () => {
  let testEnv: RulesTestEnvironment | undefined;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(RULES_PATH, 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (!testEnv) {
      throw new Error('Curriculum repository emulator failed to initialize.');
    }
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, seasonPath()), {
        seasonId: SEASON_ID,
        name: 'Synthetic curriculum season',
        status: 'draft',
      });
      await setDoc(doc(db, `${seasonPath()}/cards/flat-decoy`), {
        cardNumber: 1,
        verseText: 'Flat path decoy must not be returned.',
        reference: SHARED_REFERENCE,
      });

      await setDoc(doc(db, materialSetPath(ALPHA_SET_ID)), {
        seasonId: SEASON_ID,
        materialSetId: ALPHA_SET_ID,
        displayName: 'Alpha synthetic set',
      });
      await setDoc(doc(db, sectionPath(ALPHA_SET_ID, 'section-late')), {
        seasonId: SEASON_ID,
        materialSetId: ALPHA_SET_ID,
        sectionId: 'section-late',
        title: 'Later section',
        displayOrder: 2,
        cardIds: ['card-2'],
      });
      await setDoc(doc(db, sectionPath(ALPHA_SET_ID, 'section-early')), {
        seasonId: SEASON_ID,
        materialSetId: ALPHA_SET_ID,
        sectionId: 'section-early',
        title: 'Earlier section',
        displayOrder: 1,
        cardIds: ['card-1'],
      });
      await setDoc(doc(db, cardPath(ALPHA_SET_ID, 'card-2')), {
        seasonId: SEASON_ID,
        materialSetId: ALPHA_SET_ID,
        cardId: 'card-2',
        cardNumber: 2,
        reference: 'Book 1:2',
        verseText: 'Second alpha verse about a silver gate.',
        sectionId: 'section-late',
        tags: ['synthetic'],
      });
      await setDoc(doc(db, cardPath(ALPHA_SET_ID, 'card-1')), {
        seasonId: SEASON_ID,
        materialSetId: ALPHA_SET_ID,
        cardId: 'card-1',
        cardNumber: 1,
        reference: SHARED_REFERENCE,
        verseText: 'Alpha verse about a silver path.',
        sectionId: 'section-early',
        tags: ['synthetic'],
        annotations: [
          {
            annotationId: 'ann-alpha-1',
            cardId: 'card-1',
            type: 'highlight',
            sourceTarget: {
              strategy: 'phraseOccurrence',
              phrase: 'silver',
              occurrenceIndex: 1,
            },
            resolvedTarget: { start: 20, end: 26 },
          },
        ],
      });

      await setDoc(doc(db, materialSetPath(BETA_SET_ID)), {
        seasonId: SEASON_ID,
        materialSetId: BETA_SET_ID,
        displayName: 'Beta synthetic set',
      });
      await setDoc(doc(db, sectionPath(BETA_SET_ID, 'section-beta')), {
        seasonId: SEASON_ID,
        materialSetId: BETA_SET_ID,
        sectionId: 'section-beta',
        title: 'Beta section',
        displayOrder: 1,
        cardIds: ['card-beta'],
      });
      await setDoc(doc(db, cardPath(BETA_SET_ID, 'card-beta')), {
        seasonId: SEASON_ID,
        materialSetId: BETA_SET_ID,
        cardId: 'card-beta',
        cardNumber: 1,
        reference: SHARED_REFERENCE,
        verseText: 'Beta verse that shares a reference and stays isolated.',
        sectionId: 'section-beta',
      });

      await setDoc(doc(db, materialSetPath(EMPTY_SET_ID)), {
        seasonId: SEASON_ID,
        materialSetId: EMPTY_SET_ID,
        displayName: 'Empty synthetic set',
      });
      await setDoc(doc(db, sectionPath(EMPTY_SET_ID, 'section-empty')), {
        seasonId: SEASON_ID,
        materialSetId: EMPTY_SET_ID,
        sectionId: 'section-empty',
        title: 'Empty section',
        displayOrder: 1,
        cardIds: [],
      });
    });
  });

  function repository(): FirestoreCurriculumRepository {
    if (!testEnv) {
      throw new Error('Curriculum repository emulator failed to initialize.');
    }
    const db = testEnv.authenticatedContext(USER_ID).firestore() as Firestore;
    return new FirestoreCurriculumRepository(createFirebaseCurriculumSource(() => db));
  }

  it('loads one nested MaterialSet in card-number order with its annotation', async () => {
    const curriculum = await repository().getCurriculum(SEASON_ID, ALPHA_SET_ID);

    expect(curriculum.title).toBe('Alpha synthetic set');
    expect(curriculum.cards.map((card) => card.cardId)).toEqual(['card-1', 'card-2']);
    expect(curriculum.cards.map((card) => card.cardNumber)).toEqual([1, 2]);
    expect(curriculum.sections.map((section) => section.sectionId)).toEqual([
      'section-early',
      'section-late',
    ]);
    expect(curriculum.cards[0].annotations?.[0]).toMatchObject({
      annotationId: 'ann-alpha-1',
      cardId: 'card-1',
      type: 'highlight',
    });
    expect(curriculum.cards[0].matchedRules).toEqual([]);
    expect(curriculum.cards.some((card) => card.verseText.includes('Flat path decoy'))).toBe(
      false,
    );
  });

  it('does not leak a second MaterialSet that shares a Scripture reference', async () => {
    const alpha = await repository().getCurriculum(SEASON_ID, ALPHA_SET_ID);
    const beta = await repository().getCurriculum(SEASON_ID, BETA_SET_ID);

    expect(alpha.cards[0].reference).toBe(SHARED_REFERENCE);
    expect(beta.cards[0].reference).toBe(SHARED_REFERENCE);
    expect(alpha.cards.map((card) => card.materialSetId)).toEqual([ALPHA_SET_ID, ALPHA_SET_ID]);
    expect(beta.cards.map((card) => card.cardId)).toEqual(['card-beta']);
    expect(beta.cards[0].verseText).toContain('stays isolated');
    expect(alpha.cards.map((card) => card.verseText).join(' ')).not.toContain('stays isolated');
  });

  it('rejects a missing MaterialSet and accepts an empty card list', async () => {
    await expect(repository().getCurriculum(SEASON_ID, 'set-missing')).rejects.toBeInstanceOf(
      UnknownMaterialSetError,
    );

    const empty = await repository().getCurriculum(SEASON_ID, EMPTY_SET_ID);
    expect(empty.title).toBe('Empty synthetic set');
    expect(empty.cards).toEqual([]);
    expect(empty.sections).toHaveLength(1);
    expect(empty.sections[0].cardIds).toEqual([]);
  });
});
