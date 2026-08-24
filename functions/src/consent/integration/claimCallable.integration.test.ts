/**
 * Auth → Functions → claimParentalConsent callable → Firestore.
 *
 * Proves request.auth.uid (not a client-supplied uid) binds claimedByUid.
 *
 * Run via:
 *   npm run test:functions:integration
 */

import { initializeApp as initializeAdminApp, getApps, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp as initializeClientApp, deleteApp as deleteClientApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
} from 'firebase/auth';
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
  type Functions,
} from 'firebase/functions';

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? 'wpf-bible-qizzing';
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
const FUNCTIONS_HOST = '127.0.0.1';
const FUNCTIONS_PORT = 5001;

const shouldRun =
  Boolean(process.env.FIRESTORE_EMULATOR_HOST) &&
  Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST) &&
  process.env.RUN_CALLABLE_CLAIM_INTEGRATION === '1';

(shouldRun ? describe : describe.skip)(
  'claimParentalConsent Functions emulator callable',
  () => {
    let adminApp: ReturnType<typeof initializeAdminApp>;
    let clientApp: ReturnType<typeof initializeClientApp>;
    let functions: Functions;

    beforeAll(() => {
      process.env.IGNITE_ENV = 'dev';
      process.env.PARENT_EMAIL_HMAC_SECRET =
        process.env.PARENT_EMAIL_HMAC_SECRET ?? 'integration-test-hmac-secret';

      if (getApps().length > 0) {
        adminApp = getApps()[0]!;
      } else {
        adminApp = initializeAdminApp({ projectId: PROJECT_ID });
      }

      clientApp = initializeClientApp({
        projectId: PROJECT_ID,
        apiKey: 'demo-api-key',
        appId: 'demo-app-id',
      });
      const auth = getAuth(clientApp);
      connectAuthEmulator(auth, `http://${AUTH_HOST}`, { disableWarnings: true });
      functions = getFunctions(clientApp, 'us-central1');
      connectFunctionsEmulator(functions, FUNCTIONS_HOST, FUNCTIONS_PORT);
    });

    afterAll(async () => {
      await deleteClientApp(clientApp);
      if (adminApp) {
        await deleteApp(adminApp);
      }
    });

    async function createApprovedConsent(): Promise<{
      requestId: string;
      clientSessionToken: string;
    }> {
      const create = httpsCallable<
        { parentEmail: string },
        { requestId: string; clientSessionToken: string; status: string }
      >(functions, 'createParentalConsentRequest');

      const created = await create({
        parentEmail: `parent-callable-${Date.now()}@example.com`,
      });
      const { requestId, clientSessionToken } = created.data;
      expect(requestId).toBeTruthy();
      expect(clientSessionToken).toBeTruthy();

      // Parent email token flow is out of scope for this claim-boundary suite.
      // Force approved so claim exercises the callable auth path only.
      await getFirestore()
        .collection('parentalConsentRequests')
        .doc(requestId)
        .update({ status: 'approved' });

      return { requestId, clientSessionToken };
    }

    it('rejects unauthenticated claim; binds/idempotents/rejects via Auth context UID', async () => {
      const auth = getAuth(clientApp);
      await signOut(auth);

      const { requestId, clientSessionToken } = await createApprovedConsent();
      const claim = httpsCallable<
        {
          requestId: string;
          clientSessionToken: string;
          authenticatedUid?: string;
        },
        { status: string; bindingState: string; claimedByUid: string }
      >(functions, 'claimParentalConsent');

      await expect(
        claim({ requestId, clientSessionToken }),
      ).rejects.toMatchObject({
        code: 'functions/unauthenticated',
      });

      const password = 'test-password-123';
      const userA = await createUserWithEmailAndPassword(
        auth,
        `claimer-a-${Date.now()}@example.com`,
        password,
      );

      // Client-supplied authenticatedUid must be ignored; Auth context wins.
      const claimed = await claim({
        requestId,
        clientSessionToken,
        authenticatedUid: 'attacker-should-be-ignored',
      });
      expect(claimed.data.claimedByUid).toBe(userA.user.uid);
      expect(claimed.data.bindingState).toBe('bound');
      expect(claimed.data.status).toBe('approved');

      const snap = await getFirestore()
        .collection('parentalConsentRequests')
        .doc(requestId)
        .get();
      expect(snap.data()?.claimedByUid).toBe(userA.user.uid);

      const retry = await claim({ requestId, clientSessionToken });
      expect(retry.data.claimedByUid).toBe(userA.user.uid);

      await signOut(auth);
      const userB = await createUserWithEmailAndPassword(
        auth,
        `claimer-b-${Date.now()}@example.com`,
        password,
      );
      expect(userB.user.uid).not.toBe(userA.user.uid);

      await expect(
        claim({ requestId, clientSessionToken }),
      ).rejects.toMatchObject({
        code: 'functions/already-exists',
      });

      const snapAfter = await getFirestore()
        .collection('parentalConsentRequests')
        .doc(requestId)
        .get();
      expect(snapAfter.data()?.claimedByUid).toBe(userA.user.uid);
    });
  },
);
