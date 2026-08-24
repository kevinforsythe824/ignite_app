import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { resolve } from 'path';

const PROJECT_ID = 'ignite-rules-test';
const RULES_PATH = resolve(__dirname, '../../firestore.rules');

const USER_A = 's2-rules-user-a';
const USER_B = 's2-rules-user-b';

const VALID_PROFILE = {
  first_name: 'Test',
  last_name: 'Quizzer',
  avatar_id: null as string | null,
};

function profilePath(userId: string): string {
  return `users/${userId}/profile/main`;
}

describe('Firestore rules: Quizzer profile ownership', () => {
  let testEnv: RulesTestEnvironment | undefined;

  beforeAll(async () => {
    // Prefer explicit host/port from firebase.json; emulators:exec also sets
    // FIREBASE_EMULATOR_HUB / FIRESTORE_EMULATOR_HOST for discovery.
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

  it('allows authenticated owner to create a valid profile', async () => {
    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertSucceeds(setDoc(doc(db, profilePath(USER_A)), VALID_PROFILE));
  });

  it('allows authenticated owner to read their own profile', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), profilePath(USER_A)), VALID_PROFILE);
    });

    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertSucceeds(getDoc(doc(db, profilePath(USER_A))));
  });

  it('denies user B reading user A profile', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), profilePath(USER_A)), VALID_PROFILE);
    });

    const db = testEnv.authenticatedContext(USER_B).firestore();
    await assertFails(getDoc(doc(db, profilePath(USER_A))));
  });

  it('denies user B writing user A profile', async () => {
    const db = testEnv.authenticatedContext(USER_B).firestore();
    await assertFails(setDoc(doc(db, profilePath(USER_A)), VALID_PROFILE));
  });

  it('denies unauthenticated read', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), profilePath(USER_A)), VALID_PROFILE);
    });

    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, profilePath(USER_A))));
  });

  it('denies unauthenticated write', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, profilePath(USER_A)), VALID_PROFILE));
  });

  it('rejects unexpected fields on create', async () => {
    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertFails(
      setDoc(doc(db, profilePath(USER_A)), {
        ...VALID_PROFILE,
        email: 'leak@example.test',
      }),
    );
  });

  it('rejects empty first_name on create', async () => {
    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertFails(
      setDoc(doc(db, profilePath(USER_A)), {
        ...VALID_PROFILE,
        first_name: '',
      }),
    );
  });

  it('rejects empty last_name on create', async () => {
    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertFails(
      setDoc(doc(db, profilePath(USER_A)), {
        ...VALID_PROFILE,
        last_name: '',
      }),
    );
  });

  it('rejects malformed avatar_id type on create', async () => {
    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertFails(
      setDoc(doc(db, profilePath(USER_A)), {
        ...VALID_PROFILE,
        avatar_id: 42,
      }),
    );
  });

  it('allows authenticated owner to update first_name and last_name only', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), profilePath(USER_A)), {
        ...VALID_PROFILE,
        avatar_id: 'preset-a',
      });
    });

    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertSucceeds(
      updateDoc(doc(db, profilePath(USER_A)), {
        first_name: 'Changed',
        last_name: 'Name',
      }),
    );
  });

  it('denies owner update that changes avatar_id', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), profilePath(USER_A)), {
        ...VALID_PROFILE,
        avatar_id: 'preset-a',
      });
    });

    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertFails(
      updateDoc(doc(db, profilePath(USER_A)), {
        first_name: 'Changed',
        last_name: 'Quizzer',
        avatar_id: 'preset-b',
      }),
    );
  });

  it('denies owner update that adds unexpected fields', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), profilePath(USER_A)), VALID_PROFILE);
    });

    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertFails(
      updateDoc(doc(db, profilePath(USER_A)), {
        first_name: 'Changed',
        last_name: 'Quizzer',
        email: 'leak@example.test',
      }),
    );
  });

  it('denies user B updating user A profile names', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), profilePath(USER_A)), VALID_PROFILE);
    });

    const db = testEnv.authenticatedContext(USER_B).firestore();
    await assertFails(
      updateDoc(doc(db, profilePath(USER_A)), {
        first_name: 'Hacked',
        last_name: 'Quizzer',
      }),
    );
  });

  it('denies unauthenticated profile name update', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), profilePath(USER_A)), VALID_PROFILE);
    });

    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(db, profilePath(USER_A)), {
        first_name: 'Changed',
        last_name: 'Quizzer',
      }),
    );
  });
});
