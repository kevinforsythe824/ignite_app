import { FirebaseNotConfiguredError } from '../../../src/services/firebase';
import { InvalidQuizzerProfileDocumentError } from '../../../src/features/profile/data/mapFirestoreToQuizzerProfile';
import { QuizzerProfileError } from '../../../src/features/profile/errors/quizzerProfileError';
import { translateQuizzerProfileError } from '../../../src/features/profile/errors/translateQuizzerProfileError';

describe('translateQuizzerProfileError', () => {
  it('re-throws QuizzerProfileError unchanged', () => {
    const original = new QuizzerProfileError('unavailable', 'down', 'uid-1');
    expect(() => translateQuizzerProfileError(original, 'uid-1')).toThrow(original);
  });

  it('maps InvalidQuizzerProfileDocumentError to invalid-profile-data', () => {
    expect(() =>
      translateQuizzerProfileError(
        new InvalidQuizzerProfileDocumentError('first_name', 'must be a string', 'uid-1'),
      ),
    ).toThrow(
      expect.objectContaining({
        name: 'QuizzerProfileError',
        code: 'invalid-profile-data',
        quizzerId: 'uid-1',
      }),
    );
  });

  it('maps FirebaseNotConfiguredError to unexpected', () => {
    expect(() =>
      translateQuizzerProfileError(
        new FirebaseNotConfiguredError(['EXPO_PUBLIC_FIREBASE_API_KEY']),
        'uid-1',
      ),
    ).toThrow(
      expect.objectContaining({
        code: 'unexpected',
      }),
    );
  });

  it('maps firestore permission-denied', () => {
    expect(() =>
      translateQuizzerProfileError({ code: 'firestore/permission-denied' }, 'uid-1'),
    ).toThrow(
      expect.objectContaining({
        code: 'permission-denied',
      }),
    );
  });

  it('maps unknown errors to unexpected', () => {
    expect(() => translateQuizzerProfileError(new Error('boom'), 'uid-1')).toThrow(
      expect.objectContaining({
        code: 'unexpected',
      }),
    );
  });
});
