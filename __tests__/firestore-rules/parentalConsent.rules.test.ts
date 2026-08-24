import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { resolve } from 'path';

const PROJECT_ID = 'ignite-rules-test';
const RULES_PATH = resolve(__dirname, '../../firestore.rules');

const USER_A = 's2-rules-user-a';

describe('Firestore rules: parental consent deny-all', () => {
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

  it('denies unauthenticated read/write of consent requests', async () => {
    const db = testEnv!.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'parentalConsentRequests/req-1')));
    await assertFails(
      setDoc(doc(db, 'parentalConsentRequests/req-1'), { status: 'approved' }),
    );
  });

  it('denies authenticated read/write of consent requests', async () => {
    const db = testEnv!.authenticatedContext(USER_A).firestore();
    await assertFails(getDoc(doc(db, 'parentalConsentRequests/req-1')));
    await assertFails(
      setDoc(doc(db, 'parentalConsentRequests/req-1'), {
        status: 'approved',
        claimedByUid: USER_A,
      }),
    );
  });

  it('denies unauthenticated and authenticated access to rate limits', async () => {
    const anon = testEnv!.unauthenticatedContext().firestore();
    const authed = testEnv!.authenticatedContext(USER_A).firestore();
    await assertFails(getDoc(doc(anon, 'parentalConsentRateLimits/create:email:x')));
    await assertFails(
      setDoc(doc(authed, 'parentalConsentRateLimits/create:email:x'), {
        count: 1,
      }),
    );
  });

  it('still allows owner profile create (regression)', async () => {
    const db = testEnv!.authenticatedContext(USER_A).firestore();
    await assertSucceeds(
      setDoc(doc(db, `users/${USER_A}/profile/main`), {
        first_name: 'Test',
        last_name: 'Quizzer',
        avatar_id: null,
      }),
    );
  });
});
