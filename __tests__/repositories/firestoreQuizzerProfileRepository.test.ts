import type { FirestoreQuizzerProfileDocument } from '../../src/features/profile/data/firestoreQuizzerProfileDocument';
import { InvalidQuizzerProfileDocumentError } from '../../src/features/profile/data/mapFirestoreToQuizzerProfile';
import {
  FirestoreQuizzerProfileRepository,
  type QuizzerProfileFirestoreSource,
} from '../../src/features/profile/repositories';
import { QuizzerProfileError } from '../../src/features/profile/errors/quizzerProfileError';

function createSource(
  overrides: Partial<QuizzerProfileFirestoreSource> = {},
): QuizzerProfileFirestoreSource {
  return {
    getProfile: jest.fn(),
    createProfileIfMissing: jest.fn(),
    ...overrides,
  };
}

const VALID_DOC: FirestoreQuizzerProfileDocument = {
  first_name: 'Test',
  last_name: 'Quizzer',
  avatar_id: null,
};

describe('FirestoreQuizzerProfileRepository', () => {
  it('returns null when profile is missing', async () => {
    const source = createSource({
      getProfile: jest.fn().mockResolvedValue({ exists: false, data: undefined }),
    });
    const repository = new FirestoreQuizzerProfileRepository(source);

    await expect(repository.getProfile('uid-1')).resolves.toBeNull();
    expect(source.getProfile).toHaveBeenCalledWith('uid-1');
  });

  it('returns mapped profile when present', async () => {
    const source = createSource({
      getProfile: jest.fn().mockResolvedValue({
        exists: true,
        data: { ...VALID_DOC, avatar_id: 'preset-a' },
      }),
    });
    const repository = new FirestoreQuizzerProfileRepository(source);

    await expect(repository.getProfile('uid-1')).resolves.toEqual({
      quizzerId: 'uid-1',
      firstName: 'Test',
      lastName: 'Quizzer',
      avatarId: 'preset-a',
    });
  });

  it('creates a profile when missing via createProfileIfMissing', async () => {
    const source = createSource({
      createProfileIfMissing: jest.fn().mockResolvedValue({
        exists: true,
        data: VALID_DOC,
      }),
    });
    const repository = new FirestoreQuizzerProfileRepository(source);

    const profile = await repository.provisionProfile({
      quizzerId: 'uid-1',
      firstName: '  Test  ',
      lastName: '  Quizzer  ',
    });

    expect(profile).toEqual({
      quizzerId: 'uid-1',
      firstName: 'Test',
      lastName: 'Quizzer',
      avatarId: null,
    });
    expect(source.createProfileIfMissing).toHaveBeenCalledWith('uid-1', VALID_DOC);
  });

  it('returns existing profile unchanged on provision retry (idempotent)', async () => {
    const existingDoc: FirestoreQuizzerProfileDocument = {
      first_name: 'Established',
      last_name: 'Quizzer',
      avatar_id: 'preset-a',
    };
    const source = createSource({
      createProfileIfMissing: jest.fn().mockResolvedValue({
        exists: true,
        data: existingDoc,
      }),
    });
    const repository = new FirestoreQuizzerProfileRepository(source);

    const profile = await repository.provisionProfile({
      quizzerId: 'uid-1',
      firstName: 'Different',
      lastName: 'Name',
      avatarId: 'other',
    });

    expect(profile).toEqual({
      quizzerId: 'uid-1',
      firstName: 'Established',
      lastName: 'Quizzer',
      avatarId: 'preset-a',
    });
  });

  it('rejects invalid provision input before writing', async () => {
    const source = createSource();
    const repository = new FirestoreQuizzerProfileRepository(source);

    await expect(
      repository.provisionProfile({
        quizzerId: 'uid-1',
        firstName: '   ',
        lastName: 'Quizzer',
      }),
    ).rejects.toMatchObject({
      name: 'QuizzerProfileError',
      code: 'invalid-profile-data',
    });
    expect(source.createProfileIfMissing).not.toHaveBeenCalled();
  });

  it('translates permission-denied from getProfile', async () => {
    const source = createSource({
      getProfile: jest.fn().mockRejectedValue({ code: 'permission-denied' }),
    });
    const repository = new FirestoreQuizzerProfileRepository(source);

    await expect(repository.getProfile('uid-1')).rejects.toMatchObject({
      name: 'QuizzerProfileError',
      code: 'permission-denied',
    });
  });

  it('translates unavailable from provision', async () => {
    const source = createSource({
      createProfileIfMissing: jest.fn().mockRejectedValue({ code: 'unavailable' }),
    });
    const repository = new FirestoreQuizzerProfileRepository(source);

    await expect(
      repository.provisionProfile({
        quizzerId: 'uid-1',
        firstName: 'Test',
        lastName: 'Quizzer',
      }),
    ).rejects.toMatchObject({
      code: 'unavailable',
    });
  });

  it('translates corrupt persisted document on get', async () => {
    const source = createSource({
      getProfile: jest.fn().mockResolvedValue({
        exists: true,
        data: { first_name: '', last_name: 'Quizzer', avatar_id: null },
      }),
    });
    const repository = new FirestoreQuizzerProfileRepository(source);

    await expect(repository.getProfile('uid-1')).rejects.toBeInstanceOf(
      QuizzerProfileError,
    );
    await expect(repository.getProfile('uid-1')).rejects.toMatchObject({
      code: 'invalid-profile-data',
    });
  });

  it('does not leak raw InvalidQuizzerProfileDocumentError from provision path', async () => {
    const source = createSource({
      createProfileIfMissing: jest.fn().mockRejectedValue(
        new InvalidQuizzerProfileDocumentError('first_name', 'must be a string', 'uid-1'),
      ),
    });
    const repository = new FirestoreQuizzerProfileRepository(source);

    await expect(
      repository.provisionProfile({
        quizzerId: 'uid-1',
        firstName: 'Test',
        lastName: 'Quizzer',
      }),
    ).rejects.toMatchObject({
      name: 'QuizzerProfileError',
      code: 'invalid-profile-data',
    });
  });
});
