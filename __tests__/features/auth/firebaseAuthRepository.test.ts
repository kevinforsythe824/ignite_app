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

const sampleIdentity = {
  uid: 'user-1',
  email: 'quizzer@example.com',
  emailVerified: false,
};

describe('FirebaseAuthRepository', () => {
  it('maps getCurrentUser snapshots to AuthenticatedIdentity', () => {
    const source = createSource({
      getCurrentUser: jest.fn(() => sampleIdentity),
    });
    const repository = new FirebaseAuthRepository(source);

    expect(repository.getCurrentUser()).toEqual(sampleIdentity);
  });

  it('returns null when no current user exists', () => {
    const repository = new FirebaseAuthRepository(createSource());
    expect(repository.getCurrentUser()).toBeNull();
  });

  it('maps authenticated snapshots to AuthenticatedIdentity on sign-in', async () => {
    const source = createSource({
      signInWithEmailAndPassword: jest.fn(async () => sampleIdentity),
    });
    const repository = new FirebaseAuthRepository(source);

    await expect(
      repository.signIn({ email: 'quizzer@example.com', password: 'secret' }),
    ).resolves.toEqual(sampleIdentity);
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

  it('maps invalid-credential and invalid-login-credentials to invalid-credentials', async () => {
    const invalidCredential = createSource({
      signInWithEmailAndPassword: jest.fn(async () => {
        throw { code: 'auth/invalid-credential' };
      }),
    });
    const invalidLogin = createSource({
      signInWithEmailAndPassword: jest.fn(async () => {
        throw { code: 'auth/invalid-login-credentials' };
      }),
    });

    await expect(
      new FirebaseAuthRepository(invalidCredential).signIn({
        email: 'quizzer@example.com',
        password: 'wrong',
      }),
    ).rejects.toMatchObject({ code: 'invalid-credentials' });

    await expect(
      new FirebaseAuthRepository(invalidLogin).signIn({
        email: 'quizzer@example.com',
        password: 'wrong',
      }),
    ).rejects.toMatchObject({ code: 'invalid-credentials' });
  });

  it('maps sign-up snapshots and keeps emailVerified false as valid', async () => {
    const source = createSource({
      createUserWithEmailAndPassword: jest.fn(async () => sampleIdentity),
    });
    const repository = new FirebaseAuthRepository(source);

    await expect(
      repository.signUp({ email: 'quizzer@example.com', password: 'secret' }),
    ).resolves.toEqual(sampleIdentity);
  });

  it('translates sign-up email-already-in-use and weak-password', async () => {
    const inUse = new FirebaseAuthRepository(
      createSource({
        createUserWithEmailAndPassword: jest.fn(async () => {
          throw { code: 'auth/email-already-in-use' };
        }),
      }),
    );
    const weak = new FirebaseAuthRepository(
      createSource({
        createUserWithEmailAndPassword: jest.fn(async () => {
          throw { code: 'auth/weak-password' };
        }),
      }),
    );

    await expect(
      inUse.signUp({ email: 'quizzer@example.com', password: 'secret' }),
    ).rejects.toMatchObject({
      name: 'AuthenticationError',
      code: 'email-already-in-use',
    });
    await expect(
      inUse.signUp({ email: 'quizzer@example.com', password: 'secret' }),
    ).rejects.toMatchObject({
      message: expect.not.stringContaining('auth/'),
    });
    await expect(
      weak.signUp({ email: 'quizzer@example.com', password: '123' }),
    ).rejects.toMatchObject({ code: 'weak-password' });
  });

  it('forwards auth-state changes as application identity', () => {
    let listener:
      | ((user: { uid: string; email: string | null; emailVerified: boolean } | null) => void)
      | undefined;
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

  it('signs out through the source', async () => {
    const source = createSource();
    const repository = new FirebaseAuthRepository(source);

    await expect(repository.signOut()).resolves.toBeUndefined();
    expect(source.signOut).toHaveBeenCalledTimes(1);
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

  it('resolves password reset on success', async () => {
    const source = createSource();
    const repository = new FirebaseAuthRepository(source);

    await expect(repository.sendPasswordResetEmail('quizzer@example.com')).resolves.toBeUndefined();
    expect(source.sendPasswordResetEmail).toHaveBeenCalledWith('quizzer@example.com');
  });

  it('treats missing-account password reset as success', async () => {
    const source = createSource({
      sendPasswordResetEmail: jest.fn(async () => {
        throw { code: 'auth/user-not-found' };
      }),
    });
    const repository = new FirebaseAuthRepository(source);

    await expect(repository.sendPasswordResetEmail('missing@example.com')).resolves.toBeUndefined();
  });

  it('still throws application errors for other password-reset failures', async () => {
    const invalidEmail = new FirebaseAuthRepository(
      createSource({
        sendPasswordResetEmail: jest.fn(async () => {
          throw { code: 'auth/invalid-email' };
        }),
      }),
    );
    const network = new FirebaseAuthRepository(
      createSource({
        sendPasswordResetEmail: jest.fn(async () => {
          throw { code: 'auth/network-request-failed' };
        }),
      }),
    );
    const throttled = new FirebaseAuthRepository(
      createSource({
        sendPasswordResetEmail: jest.fn(async () => {
          throw { code: 'auth/too-many-requests' };
        }),
      }),
    );
    const wrongPasswordShaped = new FirebaseAuthRepository(
      createSource({
        sendPasswordResetEmail: jest.fn(async () => {
          throw { code: 'auth/wrong-password' };
        }),
      }),
    );

    await expect(invalidEmail.sendPasswordResetEmail('bad')).rejects.toMatchObject({
      code: 'invalid-email',
    });
    await expect(network.sendPasswordResetEmail('quizzer@example.com')).rejects.toMatchObject({
      code: 'network-unavailable',
    });
    await expect(throttled.sendPasswordResetEmail('quizzer@example.com')).rejects.toMatchObject({
      code: 'too-many-requests',
    });
    await expect(
      wrongPasswordShaped.sendPasswordResetEmail('quizzer@example.com'),
    ).rejects.toMatchObject({
      code: 'invalid-credentials',
    });
  });
});
