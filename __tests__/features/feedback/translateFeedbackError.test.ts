import { feedbackCopy } from '../../../src/features/feedback/copy/feedbackCopy';
import { FeedbackError } from '../../../src/features/feedback/errors/feedbackError';
import { translateFeedbackError } from '../../../src/features/feedback/errors/translateFeedbackError';

describe('translateFeedbackError', () => {
  it('returns FeedbackError unchanged', () => {
    const original = new FeedbackError('unavailable', 'keep');
    expect(translateFeedbackError(original)).toBe(original);
  });

  it('maps functions codes without using server message bodies', () => {
    expect(translateFeedbackError({ code: 'functions/unauthenticated', message: 'raw' })).toEqual(
      expect.objectContaining({
        code: 'unauthenticated',
        message: feedbackCopy.errors.unauthenticated,
      }),
    );
    expect(translateFeedbackError({ code: 'functions/invalid-argument', message: 'raw' })).toEqual(
      expect.objectContaining({
        code: 'invalid-argument',
        message: feedbackCopy.errors.invalidArgument,
      }),
    );
  });

  it('maps network-like failures', () => {
    expect(translateFeedbackError(new Error('Failed to fetch'))).toEqual(
      expect.objectContaining({
        code: 'network-unavailable',
        message: feedbackCopy.errors.network,
      }),
    );
  });

  it('maps unknown errors to unexpected copy', () => {
    expect(translateFeedbackError(new Error('boom'))).toEqual(
      expect.objectContaining({
        code: 'unexpected',
        message: feedbackCopy.errors.unexpected,
      }),
    );
  });
});
