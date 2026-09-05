import { Timestamp } from 'firebase-admin/firestore';

import { FeedbackError, toFeedbackHttpsError } from './feedbackHttpsError';
import type {
  FeedbackRepositoryPort,
  FeedbackServiceDeps,
  FeedbackSubmissionWrite,
} from './submitFeedback';
import { submitFeedback } from './submitFeedback';

function validPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    category: 'bug',
    title: 'Practice button',
    message: 'Practice button did not respond during synthetic DEV testing.',
    appVersion: '1.0.0',
    platform: 'ios',
    osVersion: '17.0',
    deviceType: 'mobile',
    ...overrides,
  };
}

function createMemoryRepository(): FeedbackRepositoryPort & {
  lastWrite: FeedbackSubmissionWrite | undefined;
} {
  const store: { lastWrite: FeedbackSubmissionWrite | undefined } = {
    lastWrite: undefined,
  };
  return {
    get lastWrite() {
      return store.lastWrite;
    },
    async add(document) {
      store.lastWrite = document;
      return { submissionId: 'fb-1' };
    },
  };
}

function createDeps(
  repository: FeedbackRepositoryPort,
  now = new Date('2026-08-30T19:00:00.000Z'),
): FeedbackServiceDeps {
  return {
    repository,
    environment: 'dev',
    now: () => now,
  };
}

describe('submitFeedback', () => {
  it('writes allow-listed fields with server createdAt and environment', async () => {
    const repository = createMemoryRepository();
    const now = new Date('2026-08-30T19:00:00.000Z');
    const result = await submitFeedback(createDeps(repository, now), validPayload());

    expect(result).toEqual({ submissionId: 'fb-1' });
    expect(repository.lastWrite).toEqual({
      category: 'bug',
      title: 'Practice button',
      message: 'Practice button did not respond during synthetic DEV testing.',
      appVersion: '1.0.0',
      platform: 'ios',
      osVersion: '17.0',
      deviceType: 'mobile',
      createdAt: Timestamp.fromDate(now),
      environment: 'dev',
    });
    expect(repository.lastWrite?.createdAt).toBeInstanceOf(Timestamp);
  });

  it('stores null title when omitted or blank', async () => {
    const repository = createMemoryRepository();
    await submitFeedback(createDeps(repository), validPayload({ title: '   ' }));
    expect(repository.lastWrite?.title).toBeNull();
  });

  it('does not persist actorUid, uid, userId, or client createdAt/environment', async () => {
    const repository = createMemoryRepository();
    await submitFeedback(
      createDeps(repository),
      validPayload({
        actorUid: 'user-a',
        uid: 'user-a',
        userId: 'user-a',
        createdAt: 'client-time',
        environment: 'prod',
        firstName: 'Ada',
        email: 'ada@example.com',
      }),
    );

    const written = repository.lastWrite as unknown as Record<string, unknown>;
    expect(written.actorUid).toBeUndefined();
    expect(written.uid).toBeUndefined();
    expect(written.userId).toBeUndefined();
    expect(written.firstName).toBeUndefined();
    expect(written.email).toBeUndefined();
    expect(written.environment).toBe('dev');
    expect(written.createdAt).toEqual(
      Timestamp.fromDate(new Date('2026-08-30T19:00:00.000Z')),
    );
    expect(Object.keys(written).sort()).toEqual(
      [
        'appVersion',
        'category',
        'createdAt',
        'deviceType',
        'environment',
        'message',
        'osVersion',
        'platform',
        'title',
      ].sort(),
    );
  });

  it('rejects missing auth-independent invalid category', async () => {
    const repository = createMemoryRepository();
    await expect(
      submitFeedback(createDeps(repository), validPayload({ category: 'other' })),
    ).rejects.toMatchObject({ code: 'invalid_argument' });
    expect(repository.lastWrite).toBeUndefined();
  });

  it('rejects empty and oversized messages', async () => {
    const repository = createMemoryRepository();
    await expect(
      submitFeedback(createDeps(repository), validPayload({ message: '   ' })),
    ).rejects.toBeInstanceOf(FeedbackError);
    await expect(
      submitFeedback(createDeps(repository), validPayload({ message: 'x'.repeat(2001) })),
    ).rejects.toMatchObject({ code: 'invalid_argument' });
  });

  it('rejects invalid metadata allow-list values', async () => {
    const repository = createMemoryRepository();
    await expect(
      submitFeedback(createDeps(repository), validPayload({ platform: 'windows' })),
    ).rejects.toMatchObject({ code: 'invalid_argument' });
    await expect(
      submitFeedback(createDeps(repository), validPayload({ deviceType: 'phone' })),
    ).rejects.toMatchObject({ code: 'invalid_argument' });
  });

  it('attempts a Sheets append after a successful Firestore write', async () => {
    const repository = createMemoryRepository();
    const append = jest.fn().mockResolvedValue(undefined);
    const result = await submitFeedback(
      { ...createDeps(repository), sheetsMirror: { append } },
      validPayload(),
    );

    expect(result).toEqual({ submissionId: 'fb-1' });
    expect(append).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledWith(repository.lastWrite);
  });

  it('does not fail the submission when Sheets append rejects', async () => {
    const repository = createMemoryRepository();
    const append = jest.fn().mockRejectedValue(new Error('sheets unavailable'));
    const result = await submitFeedback(
      { ...createDeps(repository), sheetsMirror: { append } },
      validPayload(),
    );

    expect(result).toEqual({ submissionId: 'fb-1' });
    expect(repository.lastWrite).toBeDefined();
  });

  it('does not attempt Sheets append when Firestore write fails', async () => {
    const append = jest.fn();
    const repository: FeedbackRepositoryPort = {
      async add() {
        throw new Error('firestore unavailable');
      },
    };

    await expect(
      submitFeedback(
        { ...createDeps(repository), sheetsMirror: { append } },
        validPayload(),
      ),
    ).rejects.toThrow('firestore unavailable');
    expect(append).not.toHaveBeenCalled();
  });
});

describe('toFeedbackHttpsError', () => {
  it('maps invalid_argument and unauthenticated without leaking internals', () => {
    expect(toFeedbackHttpsError(new FeedbackError('invalid_argument', 'message is invalid.')).code).toBe(
      'invalid-argument',
    );
    expect(toFeedbackHttpsError(new FeedbackError('unauthenticated', 'auth')).code).toBe(
      'unauthenticated',
    );
    expect(toFeedbackHttpsError(new Error('secret boom')).message).toBe(
      'Unable to submit feedback.',
    );
  });
});
