import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { resolve } from 'path';

const PROJECT_ID = 'ignite-rules-test';
const RULES_PATH = resolve(__dirname, '../../firestore.rules');

const USER_A = 's3-rules-user-a';

const SEASON_ID = 'rules-season-1';
const MATERIAL_SET_ID = 'beginner-rules';
const OTHER_MATERIAL_SET_ID = 'advanced-rules';
const SECTION_ID = 'section-1';
const CARD_ID = 'card-1';
const LEGACY_CARD_ID = 'legacy-card-1';

const SEASON_DOC = {
  title: 'Rules test season',
  status: 'draft',
};

const MATERIAL_SET_DOC = {
  title: 'Beginner rules set',
};

const OTHER_MATERIAL_SET_DOC = {
  title: 'Advanced rules set',
};

const SECTION_DOC = {
  title: 'Section one',
  order: 1,
};

const CARD_DOC = {
  cardNumber: 1,
  verseText: 'Synthetic verse text for rules tests only.',
  annotations: [
    {
      annotationId: 'ann-synthetic-1',
      kind: 'synthetic-marker',
      note: 'Synthetic embedded annotation for rules tests.',
    },
  ],
};

const LEGACY_CARD_DOC = {
  cardNumber: 1,
  verseText: 'Synthetic legacy card text for rules tests only.',
};

function seasonPath(): string {
  return `seasons/${SEASON_ID}`;
}

function materialSetPath(materialSetId: string = MATERIAL_SET_ID): string {
  return `${seasonPath()}/materialSets/${materialSetId}`;
}

function sectionPath(): string {
  return `${materialSetPath()}/sections/${SECTION_ID}`;
}

function nestedCardPath(): string {
  return `${materialSetPath()}/cards/${CARD_ID}`;
}

function legacyCardPath(): string {
  return `${seasonPath()}/cards/${LEGACY_CARD_ID}`;
}

function unknownPath(): string {
  return `${seasonPath()}/foo/document-1`;
}

describe('Firestore rules: curriculum client boundary', () => {
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
      throw new Error('Rules test environment failed to initialize.');
    }
    await testEnv.clearFirestore();
  });

  async function seedCurriculum(): Promise<void> {
    if (!testEnv) {
      throw new Error('Rules test environment failed to initialize.');
    }
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, seasonPath()), SEASON_DOC);
      await setDoc(doc(db, materialSetPath()), MATERIAL_SET_DOC);
      await setDoc(doc(db, materialSetPath(OTHER_MATERIAL_SET_ID)), OTHER_MATERIAL_SET_DOC);
      await setDoc(doc(db, sectionPath()), SECTION_DOC);
      await setDoc(doc(db, nestedCardPath()), CARD_DOC);
      await setDoc(doc(db, legacyCardPath()), LEGACY_CARD_DOC);
    });
  }

  it('denies signed-out reads of season, material set, section, nested card, and legacy card', async () => {
    await seedCurriculum();
    const db = testEnv!.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(db, seasonPath())));
    await assertFails(getDocs(collection(db, 'seasons')));
    await assertFails(getDoc(doc(db, materialSetPath())));
    await assertFails(getDocs(collection(db, `${seasonPath()}/materialSets`)));
    await assertFails(getDoc(doc(db, sectionPath())));
    await assertFails(getDocs(collection(db, `${materialSetPath()}/sections`)));
    await assertFails(getDoc(doc(db, nestedCardPath())));
    await assertFails(getDocs(collection(db, `${materialSetPath()}/cards`)));
    await assertFails(getDoc(doc(db, legacyCardPath())));
  });

  it('allows signed-in reads across nested curriculum and the legacy flat card', async () => {
    await seedCurriculum();
    const db = testEnv!.authenticatedContext(USER_A).firestore();

    await assertSucceeds(getDoc(doc(db, seasonPath())));
    await assertSucceeds(getDoc(doc(db, materialSetPath())));
    await assertSucceeds(getDocs(collection(db, `${seasonPath()}/materialSets`)));
    await assertSucceeds(getDoc(doc(db, sectionPath())));
    await assertSucceeds(getDocs(collection(db, `${materialSetPath()}/sections`)));
    await assertSucceeds(getDoc(doc(db, nestedCardPath())));
    await assertSucceeds(getDocs(collection(db, `${materialSetPath()}/cards`)));
    await assertSucceeds(getDoc(doc(db, legacyCardPath())));
    await assertSucceeds(getDoc(doc(db, materialSetPath(OTHER_MATERIAL_SET_ID))));
  });

  it('denies authenticated writes on season, material set, section, nested card, and legacy card', async () => {
    await seedCurriculum();
    const db = testEnv!.authenticatedContext(USER_A).firestore();

    await assertFails(setDoc(doc(db, 'seasons/rules-season-created'), SEASON_DOC));
    await assertFails(updateDoc(doc(db, seasonPath()), { title: 'Changed' }));
    await assertFails(deleteDoc(doc(db, seasonPath())));

    await assertFails(setDoc(doc(db, materialSetPath('created-set')), MATERIAL_SET_DOC));
    await assertFails(updateDoc(doc(db, materialSetPath()), { title: 'Changed' }));
    await assertFails(deleteDoc(doc(db, materialSetPath())));

    await assertFails(setDoc(doc(db, `${materialSetPath()}/sections/created-section`), SECTION_DOC));
    await assertFails(updateDoc(doc(db, sectionPath()), { title: 'Changed' }));
    await assertFails(deleteDoc(doc(db, sectionPath())));

    await assertFails(setDoc(doc(db, `${materialSetPath()}/cards/created-card`), CARD_DOC));
    await assertFails(
      updateDoc(doc(db, nestedCardPath()), {
        verseText: 'Synthetic replacement verse for a denied write.',
      }),
    );
    await assertFails(updateDoc(doc(db, nestedCardPath()), { cardNumber: 99 }));
    await assertFails(
      updateDoc(doc(db, nestedCardPath()), {
        annotations: [
          {
            annotationId: 'ann-synthetic-1',
            kind: 'synthetic-marker',
            note: 'Attempted annotation rewrite.',
          },
        ],
      }),
    );
    await assertFails(deleteDoc(doc(db, nestedCardPath())));

    await assertFails(
      updateDoc(doc(db, legacyCardPath()), {
        verseText: 'Synthetic legacy rewrite that must be denied.',
      }),
    );
    await assertFails(setDoc(doc(db, `${seasonPath()}/cards/legacy-created`), LEGACY_CARD_DOC));
  });

  it('denies representative signed-out curriculum writes', async () => {
    await seedCurriculum();
    const db = testEnv!.unauthenticatedContext().firestore();

    await assertFails(setDoc(doc(db, 'seasons/rules-season-anon'), SEASON_DOC));
    await assertFails(updateDoc(doc(db, materialSetPath()), { title: 'Changed' }));
    await assertFails(setDoc(doc(db, nestedCardPath()), CARD_DOC));
    await assertFails(deleteDoc(doc(db, legacyCardPath())));
  });

  it('denies get and write on an unknown season subpath', async () => {
    await seedCurriculum();
    const signedOut = testEnv!.unauthenticatedContext().firestore();
    const signedIn = testEnv!.authenticatedContext(USER_A).firestore();

    await assertFails(getDoc(doc(signedOut, unknownPath())));
    await assertFails(setDoc(doc(signedOut, unknownPath()), { note: 'nope' }));
    await assertFails(getDoc(doc(signedIn, unknownPath())));
    await assertFails(setDoc(doc(signedIn, unknownPath()), { note: 'nope' }));
  });
});
