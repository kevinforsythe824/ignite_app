import type { Functions } from 'firebase/functions';

import { feedbackCopy } from '../../../src/features/feedback/copy/feedbackCopy';
import type { FeedbackSubmissionInput } from '../../../src/features/feedback/domain/feedbackSubmissionInput';
import { FeedbackError } from '../../../src/features/feedback/errors/feedbackError';
import { FirebaseFeedbackRepository } from '../../../src/features/feedback/repositories/firebaseFeedbackRepository';
import { createFirebaseFeedbackSource } from '../../../src/features/feedback/repositories/firebaseFeedbackSource';

const validInput: FeedbackSubmissionInput = {
  category: 'bug',
  title: 'Practice button',
  message: 'Practice button did not respond during synthetic DEV testing.',
  metadata: {
    appVersion: '1.0.0',
    platform: 'ios',
    osVersion: '17.0',
    deviceType: 'mobile',
  },
};

function createSource(data: unknown, callableImpl?: jest.Mock) {
  const callable = callableImpl ?? jest.fn(async () => ({ data }));
  const callHttps = jest.fn(() => callable);
  const getFunctions = jest.fn(() => ({}) as Functions);
  return {
    source: createFirebaseFeedbackSource(getFunctions, callHttps as never),
    callable,
  };
}

describe('firebaseFeedbackSource', () => {
  it('sends the allow-listed payload and validates submissionId', async () => {
    const { source, callable } = createSource({ submissionId: 'fb-22' });
    await expect(source.submit(validInput)).resolves.toEqual({ submissionId: 'fb-22' });
    expect(callable).toHaveBeenCalledWith({
      category: 'bug',
      title: 'Practice button',
      message: 'Practice button did not respond during synthetic DEV testing.',
      appVersion: '1.0.0',
      platform: 'ios',
      osVersion: '17.0',
      deviceType: 'mobile',
    });
    const payload = callable.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('uid');
    expect(payload).not.toHaveProperty('actorUid');
    expect(payload).not.toHaveProperty('userId');
    expect(payload).not.toHaveProperty('firstName');
    expect(payload).not.toHaveProperty('email');
  });

  it('rejects an unvalidated result.data payload', async () => {
    const { source } = createSource({ ok: true });
    await expect(source.submit(validInput)).rejects.toEqual(
      expect.objectContaining({
        name: 'FeedbackError',
        code: 'unexpected',
      }),
    );
  });
});

describe('FirebaseFeedbackRepository', () => {
  it('translates source failures without exposing raw Firebase text', async () => {
    const repository = new FirebaseFeedbackRepository({
      submit: async () => {
        throw { code: 'functions/unauthenticated', message: 'raw firebase' };
      },
    });
    await expect(repository.submit(validInput)).rejects.toEqual(
      expect.objectContaining({
        name: 'FeedbackError',
        code: 'unauthenticated',
        message: feedbackCopy.errors.unauthenticated,
      }),
    );
  });

  it('re-throws FeedbackError from the adapter', async () => {
    const repository = new FirebaseFeedbackRepository({
      submit: async () => {
        throw new FeedbackError('unexpected', feedbackCopy.errors.unexpected);
      },
    });
    await expect(repository.submit(validInput)).rejects.toBeInstanceOf(FeedbackError);
  });
});
