import { setParentEmailHmacSecretForTests } from '../config/secrets';
import {
  setConsentSealSecretForTests,
} from '../config/secrets';
import { claimParentalConsent } from './claimConsent';
import {
  ImmediateConfirmationScheduler,
  RecordingConfirmationScheduler,
  sendScheduledConfirmationEmail,
} from './confirmationTask';
import { createParentalConsentRequest } from './createRequest';
import type { ConfirmationScheduler, ConsentServiceDeps } from './createRequest';
import { getParentalConsentStatus } from './getStatus';
import { MemoryConsentRepository } from './memoryRepository';
import {
  processConfirmation,
  processInitialConsent,
  revokeConsent,
} from './processInitialConsent';
import { SharedMapRateLimiter } from './sharedMapRateLimiter';
import { TestEmailCapture } from '../email/testEmailCapture';
import { ConsoleEmailSender } from '../email/consoleEmailSender';
import { CompositeEmailSender } from '../email/testEmailCapture';
import { ParentalConsentError } from '../domain/parentalConsent';

const SEAL = 'unit-test-seal-secret-value';

function buildDeps(options?: {
  scheduler?: ConsentServiceDeps['confirmationScheduler'];
}): {
  deps: ConsentServiceDeps;
  repo: MemoryConsentRepository;
  capture: TestEmailCapture;
  logs: string[];
  scheduler: ConfirmationScheduler;
} {
  setParentEmailHmacSecretForTests('unit-test-hmac-secret');
  setConsentSealSecretForTests(SEAL);
  const repo = new MemoryConsentRepository();
  const shared = new Map();
  const capture = new TestEmailCapture();
  const logs: string[] = [];
  const consoleSender = new ConsoleEmailSender((msg) => logs.push(msg));
  const recording = new RecordingConfirmationScheduler();
  const scheduler =
    options?.scheduler ??
    new ImmediateConfirmationScheduler(async (p) => {
      const depsForSend: ConsentServiceDeps = {
        repository: repo,
        rateLimiter: new SharedMapRateLimiter(shared),
        emailSender: new CompositeEmailSender(consoleSender, capture),
        environment: 'dev',
        hmacSecret: 'unit-test-hmac-secret',
        sealSecret: SEAL,
        confirmationScheduler: recording,
      };
      await sendScheduledConfirmationEmail(depsForSend, p);
    });

  const deps: ConsentServiceDeps = {
    repository: repo,
    rateLimiter: new SharedMapRateLimiter(shared),
    emailSender: new CompositeEmailSender(consoleSender, capture),
    environment: 'dev',
    hmacSecret: 'unit-test-hmac-secret',
    sealSecret: SEAL,
    confirmationScheduler: scheduler,
  };
  return { deps, repo, capture, logs, scheduler };
}

describe('parental consent use cases', () => {
  afterEach(() => {
    setParentEmailHmacSecretForTests(undefined);
    setConsentSealSecretForTests(undefined);
  });

  it('creates a pending request without returning full email', async () => {
    const { deps, capture, logs, repo } = buildDeps({
      scheduler: new RecordingConfirmationScheduler(),
    });
    const created = await createParentalConsentRequest(deps, {
      parentEmail: 'Guardian@Example.com',
      clientIp: '127.0.0.1',
    });

    expect(created.status).toBe('pending');
    expect(created.noticeDeliveryStatus).toBe('sent');
    expect(created.maskedParentEmail).toBe('g***@example.com');
    expect(JSON.stringify(created)).not.toContain('guardian@example.com');
    expect(capture.latestNotice()?.approvalToken).toBeTruthy();
    expect(capture.latestNotice()?.revokeToken).toBeTruthy();
    expect(capture.latestNotice()?.idempotencyKey).toContain('initial-notice/');
    expect(logs.join('\n')).not.toMatch(/approvalToken|revokeToken/);
    expect(logs.join('\n')).not.toContain('guardian@example.com');

    const stored = repo.peek(created.requestId);
    expect(stored?.parentEmail).toBe('guardian@example.com');
    expect(stored?.revokeTokenSealed).toBeTruthy();
    expect(
      Object.prototype.hasOwnProperty.call(stored ?? {}, 'parentEmailNormalized'),
    ).toBe(false);
  });

  it('keeps durable request when notice delivery fails', async () => {
    const { deps, repo } = buildDeps({
      scheduler: new RecordingConfirmationScheduler(),
    });
    deps.emailSender = {
      async sendParentalConsentNotice() {
        throw new Error('provider down');
      },
      async sendParentalConsentConfirmation() {
        return;
      },
    };
    const created = await createParentalConsentRequest(deps, {
      parentEmail: 'fail@example.com',
    });
    expect(created.status).toBe('pending');
    expect(created.noticeDeliveryStatus).toBe('failed_transient');
    expect(repo.peek(created.requestId)?.noticeDeliveryStatus).toBe(
      'failed_transient',
    );
  });

  it('requires client session for status', async () => {
    const { deps } = buildDeps({
      scheduler: new RecordingConfirmationScheduler(),
    });
    const created = await createParentalConsentRequest(deps, {
      parentEmail: 'a@example.com',
    });
    await expect(
      getParentalConsentStatus(deps, {
        requestId: created.requestId,
        clientSessionToken: 'wrong',
      }),
    ).rejects.toBeInstanceOf(ParentalConsentError);

    const status = await getParentalConsentStatus(deps, {
      requestId: created.requestId,
      clientSessionToken: created.clientSessionToken,
    });
    expect(status.status).toBe('pending');
    expect(status.bindingState).toBe('unbound');
  });

  it('enforces single-purpose tokens and schedules a confirmatory notice once', async () => {
    const recording = new RecordingConfirmationScheduler();
    const { deps, capture, repo } = buildDeps({ scheduler: recording });
    await createParentalConsentRequest(deps, {
      parentEmail: 'b@example.com',
    });
    const notice = capture.latestNotice();
    expect(notice?.approvalToken).toBeTruthy();
    expect(notice?.revokeToken).toBeTruthy();

    await expect(
      revokeConsent(deps, notice!.approvalToken!),
    ).rejects.toMatchObject({ code: 'invalid_token' });

    await expect(
      processInitialConsent(deps, notice!.revokeToken!),
    ).rejects.toMatchObject({ code: 'invalid_token' });

    const initial = await processInitialConsent(deps, notice!.approvalToken!);
    expect(initial.status).toBe('approved');
    expect(recording.enqueued).toHaveLength(1);

    const stored = repo.peek(initial.requestId)!;
    expect(stored.confirmationTokenSealed == null).toBe(true);
    expect(stored.confirmationDeliveryStatus).toBe('scheduled');

    await sendScheduledConfirmationEmail(deps, {
      requestId: initial.requestId,
      confirmationDeliveryVersion: 1,
    });
    const confirmation = capture.latestConfirmation();
    expect(confirmation?.confirmationToken).toBeUndefined();
    expect(confirmation?.revokeToken).toBeTruthy();
    expect(confirmation?.actionUrls?.confirm).toBeUndefined();
    expect(confirmation?.actionUrls?.revoke).toContain('/parent-consent/revoke/start');
    expect(confirmation?.idempotencyKey).toBe(
      `confirmation/${initial.requestId}/1`,
    );

    await sendScheduledConfirmationEmail(deps, {
      requestId: initial.requestId,
      confirmationDeliveryVersion: 1,
    });
    const confirmations = capture.messages.filter((m) => m.type === 'confirmation');
    expect(confirmations).toHaveLength(1);

    await expect(
      processConfirmation(deps, notice!.approvalToken!),
    ).rejects.toMatchObject({ code: 'invalid_token' });
  });

  it('binds claim from authenticated uid only', async () => {
    const { deps, capture } = buildDeps();
    const created = await createParentalConsentRequest(deps, {
      parentEmail: 'c@example.com',
    });
    const notice = capture.latestNotice()!;
    await processInitialConsent(deps, notice.approvalToken!);
    expect(capture.latestConfirmation()?.revokeToken).toBeTruthy();
    expect(capture.latestConfirmation()?.confirmationToken).toBeUndefined();

    const claimed = await claimParentalConsent(deps, {
      requestId: created.requestId,
      clientSessionToken: created.clientSessionToken,
      authenticatedUid: 'uid-a',
    });
    expect(claimed.bindingState).toBe('bound');
    expect(claimed.claimedByUid).toBe('uid-a');

    await expect(
      claimParentalConsent(deps, {
        requestId: created.requestId,
        clientSessionToken: created.clientSessionToken,
        authenticatedUid: 'uid-b',
      }),
    ).rejects.toMatchObject({ code: 'already_bound' });
  });

  it('expires pending requests on access after TTL', async () => {
    const { deps, capture, repo } = buildDeps({
      scheduler: new RecordingConfirmationScheduler(),
    });
    let now = new Date('2026-01-01T00:00:00.000Z');
    deps.now = () => now;
    const created = await createParentalConsentRequest(deps, {
      parentEmail: 'd@example.com',
    });
    now = new Date('2026-01-10T00:00:00.000Z');
    await expect(
      processInitialConsent(deps, capture.latestNotice()!.approvalToken!),
    ).resolves.toMatchObject({ status: 'expired' });
    expect(repo.peek(created.requestId)?.status).toBe('expired');
  });
});
