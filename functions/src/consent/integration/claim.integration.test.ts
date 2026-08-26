/**
 * Auth Emulator integration: proves claim uses a real Auth uid.
 *
 * Run via:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
 *   PARENT_EMAIL_HMAC_SECRET=integration-test-secret \
 *   GCLOUD_PROJECT=ignite-rules-test \
 *   npx jest --config jest.integration.config.js
 *
 * Prefer launching through:
 *   npm run test:functions:integration
 */

import { initializeApp, getApps, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

import { setParentEmailHmacSecretForTests } from '../../config/secrets';
import { setConsentSealSecretForTests } from '../../config/secrets';
import { claimParentalConsent } from '../claimConsent';
import { ImmediateConfirmationScheduler, RecordingConfirmationScheduler, sendScheduledConfirmationEmail } from '../confirmationTask';
import { createParentalConsentRequest } from '../createRequest';
import type { ConsentServiceDeps } from '../createRequest';
import {
  processInitialConsent,
} from '../processInitialConsent';
import { FirestoreRateLimiter } from '../rateLimiter';
import { ConsentRepository } from '../repository';
import { TestEmailCapture } from '../../email/testEmailCapture';
import { ConsoleEmailSender } from '../../email/consoleEmailSender';
import { CompositeEmailSender } from '../../email/testEmailCapture';

const PROJECT_ID = process.env.GCLOUD_PROJECT ?? 'ignite-rules-test';

const shouldRun =
  Boolean(process.env.FIRESTORE_EMULATOR_HOST) &&
  Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);

(shouldRun ? describe : describe.skip)(
  'claimParentalConsent Auth+Firestore emulator',
  () => {
    let app: ReturnType<typeof initializeApp>;

    beforeAll(() => {
      setParentEmailHmacSecretForTests('integration-test-hmac-secret');
      setConsentSealSecretForTests('integration-test-seal-secret');
      process.env.PARENT_EMAIL_HMAC_SECRET = 'integration-test-hmac-secret';
      process.env.CONSENT_TOKEN_SEAL_SECRET = 'integration-test-seal-secret';
      process.env.IGNITE_ENV = 'dev';
      if (getApps().length > 0) {
        app = getApps()[0]!;
      } else {
        app = initializeApp({ projectId: PROJECT_ID });
      }
    });

    afterAll(async () => {
      setParentEmailHmacSecretForTests(undefined);
      setConsentSealSecretForTests(undefined);
      if (app) {
        await deleteApp(app);
      }
    });

    it('binds claimedByUid from Auth Emulator user uid (not client-supplied)', async () => {
      const db = getFirestore();
      const auth = getAuth();
      const capture = new TestEmailCapture();
      const consoleSender = new ConsoleEmailSender(() => undefined);
      const emailSender = new CompositeEmailSender(consoleSender, capture);
      const recording = new RecordingConfirmationScheduler();

      const deps: ConsentServiceDeps = {
        repository: new ConsentRepository(db),
        rateLimiter: new FirestoreRateLimiter(db),
        emailSender,
        environment: 'dev',
        hmacSecret: 'integration-test-hmac-secret',
        sealSecret: 'integration-test-seal-secret',
        confirmationScheduler: recording,
        db,
      };
      deps.confirmationScheduler = new ImmediateConfirmationScheduler(
        async (p) => {
          await sendScheduledConfirmationEmail(
            { ...deps, confirmationScheduler: recording },
            p,
          );
        },
      );

      const user = await auth.createUser({
        email: `claim-${Date.now()}@example.com`,
        password: 'test-password-123',
      });

      const created = await createParentalConsentRequest(deps, {
        parentEmail: `parent-${Date.now()}@example.com`,
        clientIp: '127.0.0.1',
      });
      const notice = capture.latestNotice();
      expect(notice?.approvalToken).toBeTruthy();

      await processInitialConsent(deps, notice!.approvalToken!);
      const confirmation = capture.latestConfirmation();
      expect(confirmation?.revokeToken).toBeTruthy();
      expect(confirmation?.confirmationToken).toBeUndefined();

      // Simulate callable extracting uid solely from Auth context.
      const authenticatedUid = user.uid;
      const claimed = await claimParentalConsent(deps, {
        requestId: created.requestId,
        clientSessionToken: created.clientSessionToken,
        authenticatedUid,
      });

      expect(claimed.claimedByUid).toBe(user.uid);
      expect(claimed.status).toBe('approved');

      const snap = await db
        .collection('parentalConsentRequests')
        .doc(created.requestId)
        .get();
      expect(snap.data()?.claimedByUid).toBe(user.uid);
      expect(snap.data()?.status).toBe('approved');
      expect(snap.data()).not.toHaveProperty('parentEmailNormalized');

      await auth.deleteUser(user.uid);
    });
  },
);
