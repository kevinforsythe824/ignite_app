import { getApps, initializeApp } from 'firebase-admin/app';
import { getFunctions } from 'firebase-admin/functions';
import { getFirestore } from 'firebase-admin/firestore';

import {
  isEmulatorOrConsentTestContext,
  readIgniteEnvironment,
} from '../config/environment';
import {
  getConsentSealSecret,
  getParentEmailHmacSecret,
  getResendApiKey,
} from '../config/secrets';
import { ParentalConsentError } from '../domain/parentalConsent';
import { ConsoleEmailSender } from '../email/consoleEmailSender';
import type { EmailSender } from '../email/emailSender';
import { ResendEmailSender } from '../email/resendEmailSender';
import type { TestEmailCapture } from '../email/testEmailCapture';
import { CompositeEmailSender } from '../email/testEmailCapture';
import {
  ImmediateConfirmationScheduler,
  RecordingConfirmationScheduler,
  sendScheduledConfirmationEmail,
} from './confirmationTask';
import type {
  ConfirmationScheduler,
  ConsentServiceDeps,
} from './createRequest';
import { FirestoreRateLimiter } from './rateLimiter';
import { ConsentRepository } from './repository';

let testEmailCapture: TestEmailCapture | undefined;
let testDepsOverride: ConsentServiceDeps | undefined;
let testScheduler: ConfirmationScheduler | undefined;

export function setTestEmailCapture(capture: TestEmailCapture | undefined): void {
  testEmailCapture = capture;
}

export function setConsentServiceDepsForTests(
  deps: ConsentServiceDeps | undefined,
): void {
  testDepsOverride = deps;
}

export function setConfirmationSchedulerForTests(
  scheduler: ConfirmationScheduler | undefined,
): void {
  testScheduler = scheduler;
}

export function getTestEmailCapture(): TestEmailCapture | undefined {
  return testEmailCapture;
}

function ensureAdminApp(): void {
  if (getApps().length === 0) {
    initializeApp();
  }
}

export function resolveConsentEmailSender(params: {
  emulator: boolean;
  resendApiKey: string | undefined;
  emailSender?: EmailSender;
  testCapture?: TestEmailCapture;
}): EmailSender {
  if (params.emailSender) {
    return params.emailSender;
  }
  if (params.testCapture) {
    return new CompositeEmailSender(new ConsoleEmailSender(), params.testCapture);
  }
  if (!params.emulator) {
    if (!params.resendApiKey) {
      throw new ParentalConsentError(
        'internal',
        'RESEND_API_KEY is not configured for deployed Functions.',
      );
    }
    return new ResendEmailSender(params.resendApiKey);
  }
  return new ConsoleEmailSender();
}

function buildEmailSender(options?: { emailSender?: EmailSender }): EmailSender {
  return resolveConsentEmailSender({
    emulator: isEmulatorOrConsentTestContext(),
    resendApiKey: getResendApiKey(),
    emailSender: options?.emailSender,
    testCapture: testEmailCapture,
  });
}

export function buildCloudTasksConfirmationScheduler(): ConfirmationScheduler {
  return {
    async enqueueConfirmationEmail(params) {
      const queue = getFunctions().taskQueue(
        'sendParentalConsentConfirmationTask',
      );
      await queue.enqueue(
        {
          requestId: params.requestId,
          confirmationDeliveryVersion: params.confirmationDeliveryVersion,
        },
        {
          scheduleDelaySeconds: Math.max(0, Math.ceil(params.delayMs / 1000)),
          dispatchDeadlineSeconds: 60 * 5,
        },
      );
    },
  };
}

function buildCoreDeps(params: {
  emailSender: EmailSender;
  confirmationScheduler: ConfirmationScheduler;
  hmacSecret: string;
  sealSecret: string;
}): ConsentServiceDeps {
  ensureAdminApp();
  const db = getFirestore();
  return {
    repository: new ConsentRepository(db),
    rateLimiter: new FirestoreRateLimiter(db),
    emailSender: params.emailSender,
    environment: readIgniteEnvironment(),
    hmacSecret: params.hmacSecret,
    sealSecret: params.sealSecret,
    confirmationScheduler: params.confirmationScheduler,
    db,
  };
}

export function buildConsentServiceDeps(
  options?: {
    emailSender?: EmailSender;
    hmacSecret?: string;
    sealSecret?: string;
    confirmationScheduler?: ConfirmationScheduler;
  },
): ConsentServiceDeps {
  if (testDepsOverride) {
    return testDepsOverride;
  }

  const emailSender = buildEmailSender(options);
  const hmacSecret = options?.hmacSecret ?? getParentEmailHmacSecret();
  const sealSecret = options?.sealSecret ?? getConsentSealSecret();

  let confirmationScheduler =
    options?.confirmationScheduler ?? testScheduler ?? undefined;

  if (!confirmationScheduler) {
    if (isEmulatorOrConsentTestContext()) {
      confirmationScheduler = new ImmediateConfirmationScheduler(async (p) => {
        const deps = buildCoreDeps({
          emailSender,
          confirmationScheduler: new RecordingConfirmationScheduler(),
          hmacSecret,
          sealSecret,
        });
        await sendScheduledConfirmationEmail(deps, p);
      });
    } else {
      confirmationScheduler = buildCloudTasksConfirmationScheduler();
    }
  }

  return buildCoreDeps({
    emailSender,
    confirmationScheduler,
    hmacSecret,
    sealSecret,
  });
}
