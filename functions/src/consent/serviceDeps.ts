import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { readIgniteEnvironment } from '../config/environment';
import { getParentEmailHmacSecret } from '../config/secrets';
import { ConsoleEmailSender } from '../email/consoleEmailSender';
import type { EmailSender } from '../email/emailSender';
import type { TestEmailCapture } from '../email/testEmailCapture';
import { CompositeEmailSender } from '../email/testEmailCapture';
import type { ConsentServiceDeps } from './createRequest';
import { FirestoreRateLimiter } from './rateLimiter';
import { ConsentRepository } from './repository';

let testEmailCapture: TestEmailCapture | undefined;
let testDepsOverride: ConsentServiceDeps | undefined;

export function setTestEmailCapture(capture: TestEmailCapture | undefined): void {
  testEmailCapture = capture;
}

export function setConsentServiceDepsForTests(
  deps: ConsentServiceDeps | undefined,
): void {
  testDepsOverride = deps;
}

export function getTestEmailCapture(): TestEmailCapture | undefined {
  return testEmailCapture;
}

function ensureAdminApp(): void {
  if (getApps().length === 0) {
    initializeApp();
  }
}

export function buildConsentServiceDeps(
  options?: {
    emailSender?: EmailSender;
    hmacSecret?: string;
  },
): ConsentServiceDeps {
  if (testDepsOverride) {
    return testDepsOverride;
  }

  ensureAdminApp();
  const db = getFirestore();
  const consoleSender = new ConsoleEmailSender();
  const emailSender =
    options?.emailSender ??
    (testEmailCapture
      ? new CompositeEmailSender(consoleSender, testEmailCapture)
      : consoleSender);

  return {
    repository: new ConsentRepository(db),
    rateLimiter: new FirestoreRateLimiter(db),
    emailSender,
    environment: readIgniteEnvironment(),
    hmacSecret: options?.hmacSecret ?? getParentEmailHmacSecret(),
    db,
  };
}
