import { setParentEmailHmacSecretForTests } from '../config/secrets';
import { claimParentalConsent } from './claimConsent';
import { createParentalConsentRequest } from './createRequest';
import type { ConsentServiceDeps } from './createRequest';
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

function buildDeps(): {
  deps: ConsentServiceDeps;
  repo: MemoryConsentRepository;
  capture: TestEmailCapture;
  logs: string[];
} {
  setParentEmailHmacSecretForTests('unit-test-hmac-secret');
  const repo = new MemoryConsentRepository();
  const shared = new Map();
  const capture = new TestEmailCapture();
  const logs: string[] = [];
  const consoleSender = new ConsoleEmailSender((msg) => logs.push(msg));
  const deps: ConsentServiceDeps = {
    repository: repo,
    rateLimiter: new SharedMapRateLimiter(shared),
    emailSender: new CompositeEmailSender(consoleSender, capture),
    environment: 'dev',
    hmacSecret: 'unit-test-hmac-secret',
  };
  return { deps, repo, capture, logs };
}

describe('parental consent use cases', () => {
  afterEach(() => {
    setParentEmailHmacSecretForTests(undefined);
  });

  it('creates a pending request without returning full email', async () => {
    const { deps, capture, logs, repo } = buildDeps();
    const created = await createParentalConsentRequest(deps, {
      parentEmail: 'Guardian@Example.com',
      clientIp: '127.0.0.1',
    });

    expect(created.status).toBe('pending');
    expect(created.maskedParentEmail).toBe('g***@example.com');
    expect(JSON.stringify(created)).not.toContain('guardian@example.com');
    expect(capture.latestNotice()?.approvalToken).toBeTruthy();
    expect(capture.latestNotice()?.revokeToken).toBeTruthy();
    expect(logs.join('\n')).not.toMatch(/approvalToken|revokeToken/);
    expect(logs.join('\n')).not.toContain('guardian@example.com');

    const stored = repo.peek(created.requestId);
    expect(stored?.parentEmail).toBe('guardian@example.com');
    expect(
      Object.prototype.hasOwnProperty.call(stored ?? {}, 'parentEmailNormalized'),
    ).toBe(false);
  });

  it('requires client session for status', async () => {
    const { deps } = buildDeps();
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

  it('enforces single-purpose tokens for parent actions', async () => {
    const { deps, capture } = buildDeps();
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
    expect(initial.status).toBe('initial_consent_received');

    const confirmation = capture.latestConfirmation();
    expect(confirmation?.confirmationToken).toBeTruthy();

    await expect(
      processConfirmation(deps, notice!.approvalToken!),
    ).rejects.toMatchObject({ code: 'invalid_token' });

    const approved = await processConfirmation(
      deps,
      confirmation!.confirmationToken!,
    );
    expect(approved.status).toBe('approved');
  });

  it('revokes only with revokeToken', async () => {
    const { deps, capture } = buildDeps();
    const created = await createParentalConsentRequest(deps, {
      parentEmail: 'c@example.com',
    });
    const notice = capture.latestNotice();
    const revoked = await revokeConsent(deps, notice!.revokeToken!);
    expect(revoked.status).toBe('revoked');

    await expect(
      claimParentalConsent(deps, {
        requestId: created.requestId,
        clientSessionToken: created.clientSessionToken,
        authenticatedUid: 'user-1',
      }),
    ).rejects.toMatchObject({ code: 'revoked' });
  });

  it('claims using authenticated uid only and stays approved', async () => {
    const { deps, capture, repo } = buildDeps();
    const created = await createParentalConsentRequest(deps, {
      parentEmail: 'd@example.com',
    });
    const notice = capture.latestNotice();
    await processInitialConsent(deps, notice!.approvalToken!);
    const confirmation = capture.latestConfirmation();
    await processConfirmation(deps, confirmation!.confirmationToken!);

    await expect(
      claimParentalConsent(deps, {
        requestId: created.requestId,
        clientSessionToken: created.clientSessionToken,
        authenticatedUid: '',
      }),
    ).rejects.toMatchObject({ code: 'unauthenticated' });

    const claimed = await claimParentalConsent(deps, {
      requestId: created.requestId,
      clientSessionToken: created.clientSessionToken,
      authenticatedUid: 'uid-a',
    });
    expect(claimed.bindingState).toBe('bound');
    expect(claimed.claimedByUid).toBe('uid-a');
    expect(claimed.status).toBe('approved');
    expect(repo.peek(created.requestId)?.status).toBe('approved');

    const retry = await claimParentalConsent(deps, {
      requestId: created.requestId,
      clientSessionToken: created.clientSessionToken,
      authenticatedUid: 'uid-a',
    });
    expect(retry.claimedByUid).toBe('uid-a');

    await expect(
      claimParentalConsent(deps, {
        requestId: created.requestId,
        clientSessionToken: created.clientSessionToken,
        authenticatedUid: 'uid-b',
      }),
    ).rejects.toMatchObject({ code: 'already_bound' });
  });

  it('shares rate-limit counters across limiter instances', async () => {
    setParentEmailHmacSecretForTests('unit-test-hmac-secret');
    const shared = new Map();
    const limiterA = new SharedMapRateLimiter(shared);
    const limiterB = new SharedMapRateLimiter(shared);

    await limiterA.consume({ kind: 'create:email', key: 'hash-1', limit: 2 });
    await limiterB.consume({ kind: 'create:email', key: 'hash-1', limit: 2 });
    await expect(
      limiterA.consume({ kind: 'create:email', key: 'hash-1', limit: 2 }),
    ).rejects.toMatchObject({ code: 'resource_exhausted' });
  });
});
