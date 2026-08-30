import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { resolve } from 'path';

const PROJECT_ID = 'ignite-rules-test';
const RULES_PATH = resolve(__dirname, '../../firestore.rules');

const USER_A = 's2-feedback-submit-001';

describe('Firestore rules: feedbackSubmissions deny-all', () => {
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

  it('denies unauthenticated read/create/update/delete', async () => {
    const db = testEnv!.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'feedbackSubmissions/fb-1')));
    await assertFails(
      setDoc(doc(db, 'feedbackSubmissions/fb-1'), { category: 'bug', message: 'x' }),
    );
    await assertFails(updateDoc(doc(db, 'feedbackSubmissions/fb-1'), { message: 'y' }));
    await assertFails(deleteDoc(doc(db, 'feedbackSubmissions/fb-1')));
  });

  it('denies authenticated read/create/update/delete', async () => {
    const db = testEnv!.authenticatedContext(USER_A).firestore();
    await assertFails(getDoc(doc(db, 'feedbackSubmissions/fb-1')));
    await assertFails(
      setDoc(doc(db, 'feedbackSubmissions/fb-1'), {
        category: 'bug',
        message: 'Practice button did not respond during synthetic DEV testing.',
        uid: USER_A,
      }),
    );
    await assertFails(updateDoc(doc(db, 'feedbackSubmissions/fb-1'), { message: 'y' }));
    await assertFails(deleteDoc(doc(db, 'feedbackSubmissions/fb-1')));
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
