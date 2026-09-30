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

const USER_A = 's3-rules-user-a';
const USER_B = 's3-rules-user-b';
const SEASON_ID = 'rules-season-1';
const REGION_ID = 'northwest';

const VALID_PARTICIPATION = {
  quizzerId: USER_A,
  seasonId: SEASON_ID,
  regionId: REGION_ID,
  readiness: 'ready',
  participationType: 'competitive',
  divisionId: 'beginner',
};

function participationPath(userId: string, seasonId = SEASON_ID): string {
  return `users/${userId}/seasons/${seasonId}`;
}

function regionPath(regionId = REGION_ID): string {
  return `seasons/${SEASON_ID}/regions/${regionId}`;
}

describe('Firestore rules: participation and official regions', () => {
  let testEnv: RulesTestEnvironment;

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
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('denies signed-out participation reads and writes', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), participationPath(USER_A)), VALID_PARTICIPATION);
    });

    const signedOut = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(signedOut, participationPath(USER_A))));
    await assertFails(setDoc(doc(signedOut, participationPath(USER_A)), VALID_PARTICIPATION));
  });

  it('allows the owner to read and denies owner create, update, and delete', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), participationPath(USER_A)), VALID_PARTICIPATION);
    });

    const owner = testEnv.authenticatedContext(USER_A).firestore();
    await assertSucceeds(getDoc(doc(owner, participationPath(USER_A))));
    await assertFails(setDoc(doc(owner, participationPath(USER_A)), VALID_PARTICIPATION));
    await assertFails(
      updateDoc(doc(owner, participationPath(USER_A)), { regionId: 'southwest' }),
    );
    await assertFails(deleteDoc(doc(owner, participationPath(USER_A))));
  });

  it('denies another user reading or writing participation, including a valid-looking payload', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), participationPath(USER_A)), VALID_PARTICIPATION);
    });

    const other = testEnv.authenticatedContext(USER_B).firestore();
    await assertFails(getDoc(doc(other, participationPath(USER_A))));
    await assertFails(
      setDoc(doc(other, participationPath(USER_A)), {
        ...VALID_PARTICIPATION,
        quizzerId: USER_B,
      }),
    );
    await assertFails(updateDoc(doc(other, participationPath(USER_A)), { regionId: 'central' }));
    await assertFails(deleteDoc(doc(other, participationPath(USER_A))));
  });

  it('denies the owner creating a valid-looking participation document', async () => {
    const owner = testEnv.authenticatedContext(USER_A).firestore();
    await assertFails(setDoc(doc(owner, participationPath(USER_A)), VALID_PARTICIPATION));
  });

  it('denies unknown nested paths under the user', async () => {
    const owner = testEnv.authenticatedContext(USER_A).firestore();
    const signedOut = testEnv.unauthenticatedContext().firestore();
    const nested = `${participationPath(USER_A)}/progress/main`;
    const sibling = `users/${USER_A}/notes/main`;

    await assertFails(getDoc(doc(owner, nested)));
    await assertFails(setDoc(doc(owner, nested), { note: 'nope' }));
    await assertFails(getDoc(doc(signedOut, sibling)));
    await assertFails(setDoc(doc(owner, sibling), { note: 'nope' }));
  });

  it('allows a signed-in region read and denies signed-out reads and all client writes', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), regionPath()), {
        regionId: REGION_ID,
        displayName: 'Northwest',
        active: true,
      });
    });

    const signedIn = testEnv.authenticatedContext(USER_A).firestore();
    const signedOut = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(signedIn, regionPath())));
    await assertFails(getDoc(doc(signedOut, regionPath())));
    await assertFails(
      setDoc(doc(signedIn, regionPath()), { regionId: REGION_ID, displayName: 'Northwest' }),
    );
    await assertFails(updateDoc(doc(signedIn, regionPath()), { displayName: 'Changed' }));
    await assertFails(deleteDoc(doc(signedIn, regionPath())));
  });

  it('denies an unknown season sibling subcollection', async () => {
    const signedIn = testEnv.authenticatedContext(USER_A).firestore();
    const path = `seasons/${SEASON_ID}/tournaments/event-1`;
    await assertFails(getDoc(doc(signedIn, path)));
    await assertFails(setDoc(doc(signedIn, path), { name: 'nope' }));
  });
});
