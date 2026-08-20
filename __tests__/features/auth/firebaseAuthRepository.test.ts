import {
  AuthenticationError,
  FirebaseAuthRepository,
  type AuthFirebaseSource,
} from '../../../src/features/auth';

function createSource(overrides: Partial<AuthFirebaseSource> = {}): AuthFirebaseSource {
  return {
    getCurrentUser: jest.fn(() => null),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(async () => undefined),
    sendPasswordResetEmail: jest.fn(async () => undefined),
    onAuthStateChanged: jest.fn(() => jest.fn()),
    ...overrides,
  };
}

describe('FirebaseAuthRepository', () => {
  it('maps authenticated snapshots to AuthenticatedIdentity', async () => {
    const source = createSource({
      signInWithEmailAndPassword: jest.fn(async () => ({
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      })),
    });
    const repository = new FirebaseAuthRepository(source);

    await expect(
      repository.signIn({ email: 'quizzer@example.com', password: 'secret' }),
    ).resolves.toEqual({
      uid: 'user-1',
      email: 'quizzer@example.com',
      emailVerified: false,
    });
  });

  it('translates Firebase sign-in failures', async () => {
    const source = createSource({
      signInWithEmailAndPassword: jest.fn(async () => {
        throw { code: 'auth/invalid-email' };
      }),
    });
    const repository = new FirebaseAuthRepository(source);

    await expect(
      repository.signIn({ email: 'bad', password: 'secret' }),
    ).rejects.toMatchObject({
      name: 'AuthenticationError',
      code: 'invalid-email',
    });
    await expect(
      repository.signIn({ email: 'bad', password: 'secret' }),
    ).rejects.not.toHaveProperty('code', 'auth/invalid-email');
  });

  it('forwards auth-state changes as application identity', () => {
    let listener: ((user: { uid: string; email: string | null; emailVerified: boolean } | null) => void) | undefined;
    const source = createSource({
      onAuthStateChanged: jest.fn((nextListener) => {
        listener = nextListener;
        return jest.fn();
      }),
    });
    const repository = new FirebaseAuthRepository(source);
    const observed: Array<{ uid: string } | null> = [];

    repository.onAuthStateChanged((identity) => {
      observed.push(identity);
    });

    listener?.({
      uid: 'user-2',
      email: 'returning@example.com',
      emailVerified: true,
    });
    listener?.(null);

    expect(observed).toEqual([
      {
        uid: 'user-2',
        email: 'returning@example.com',
        emailVerified: true,
      },
      null,
    ]);
  });

  it('does not leak Firebase errors from signOut', async () => {
    const source = createSource({
      signOut: jest.fn(async () => {
        throw { code: 'auth/network-request-failed' };
      }),
    });
    const repository = new FirebaseAuthRepository(source);

    await expect(repository.signOut()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('translates Firebase password-reset failures', async () => {
    const source = createSource({
      sendPasswordResetEmail: jest.fn(async () => {
        throw { code: 'auth/missing-email' };
      }),
    });
    const repository = new FirebaseAuthRepository(source);

    await expect(repository.sendPasswordResetEmail('')).rejects.toMatchObject({
      name: 'AuthenticationError',
      code: 'invalid-email',
    });
  });
});
