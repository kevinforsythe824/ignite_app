import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import {
  AuthenticationError,
  AuthProvider,
  useAuth,
  type AuthenticatedIdentity,
  type AuthRepository,
  type EmailPasswordCredentials,
} from '../../../src/features/auth';

interface AuthRepositoryFake extends AuthRepository {
  emit(identity: AuthenticatedIdentity | null): void;
}

function createAuthRepositoryFake(options?: {
  emitOnSubscribe?: boolean;
  signInError?: AuthenticationError;
  resetError?: AuthenticationError;
}): AuthRepositoryFake {
  let current: AuthenticatedIdentity | null = null;
  const listeners = new Set<(identity: AuthenticatedIdentity | null) => void>();
  const emitOnSubscribe = options?.emitOnSubscribe ?? true;

  const emit = (identity: AuthenticatedIdentity | null) => {
    current = identity;
    listeners.forEach((listener) => listener(identity));
  };

  return {
    emit,
    getCurrentUser: jest.fn(() => current),
    signIn: jest.fn(async (credentials: EmailPasswordCredentials) => {
      if (options?.signInError) {
        throw options.signInError;
      }
      const identity: AuthenticatedIdentity = {
        uid: 'user-1',
        email: credentials.email,
        emailVerified: false,
      };
      emit(identity);
      return identity;
    }),
    signUp: jest.fn(async (credentials: EmailPasswordCredentials) => {
      const identity: AuthenticatedIdentity = {
        uid: 'user-1',
        email: credentials.email,
        emailVerified: false,
      };
      emit(identity);
      return identity;
    }),
    signOut: jest.fn(async () => {
      emit(null);
    }),
    sendPasswordResetEmail: jest.fn(async () => {
      if (options?.resetError) {
        throw options.resetError;
      }
    }),
    changeEmail: jest.fn(async () => undefined),
    changePassword: jest.fn(async () => undefined),
    refreshIdentity: jest.fn(async () => current),
    onAuthStateChanged: jest.fn((listener) => {
      listeners.add(listener);
      if (emitOnSubscribe) {
        listener(current);
      }
      return () => {
        listeners.delete(listener);
      };
    }),
  };
}

function AuthProbe(): React.JSX.Element {
  const { session, identity } = useAuth();
  return (
    <>
      <Text testID="auth-status">{session.status}</Text>
      <Text testID="auth-email">{identity?.email ?? ''}</Text>
    </>
  );
}

function renderAuthProbe(
  repository: ReturnType<typeof createAuthRepositoryFake>,
): ReactTestRenderer {
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = TestRenderer.create(
      <AuthProvider repository={repository}>
        <AuthProbe />
      </AuthProvider>,
    );
  });
  return tree!;
}

describe('AuthProvider', () => {
  it('resolves initializing to unauthenticated without blocking children', () => {
    const tree = renderAuthProbe(createAuthRepositoryFake());
    expect(tree.root.findByProps({ testID: 'auth-status' }).props.children).toBe(
      'unauthenticated',
    );
    expect(tree.root.findByProps({ testID: 'auth-email' }).props.children).toBe('');
  });

  it('restores an authenticated session from a delayed auth-state callback', () => {
    const repository = createAuthRepositoryFake({ emitOnSubscribe: false });
    const tree = renderAuthProbe(repository);

    expect(tree.root.findByProps({ testID: 'auth-status' }).props.children).toBe('initializing');

    act(() => {
      repository.emit({
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      });
    });

    expect(tree.root.findByProps({ testID: 'auth-status' }).props.children).toBe('authenticated');
    expect(tree.root.findByProps({ testID: 'auth-email' }).props.children).toBe(
      'quizzer@example.com',
    );
  });

  it('restores an unauthenticated session from a delayed null callback', () => {
    const repository = createAuthRepositoryFake({ emitOnSubscribe: false });
    const tree = renderAuthProbe(repository);

    expect(tree.root.findByProps({ testID: 'auth-status' }).props.children).toBe('initializing');

    act(() => {
      repository.emit(null);
    });

    expect(tree.root.findByProps({ testID: 'auth-status' }).props.children).toBe(
      'unauthenticated',
    );
  });

  it('becomes authenticated after sign-in', async () => {
    const repository = createAuthRepositoryFake();
    const tree = renderAuthProbe(repository);
    let result: { signIn: (credentials: { email: string; password: string }) => Promise<void> };

    function ActionsProbe(): React.JSX.Element {
      result = useAuth();
      return <AuthProbe />;
    }

    act(() => {
      tree.update(
        <AuthProvider repository={repository}>
          <ActionsProbe />
        </AuthProvider>,
      );
    });

    await act(async () => {
      await result!.signIn({ email: 'quizzer@example.com', password: 'secret' });
    });

    expect(tree.root.findByProps({ testID: 'auth-status' }).props.children).toBe('authenticated');
    expect(tree.root.findByProps({ testID: 'auth-email' }).props.children).toBe(
      'quizzer@example.com',
    );
  });

  it('keeps the session unauthenticated when sign-in fails', async () => {
    const repository = createAuthRepositoryFake({
      signInError: new AuthenticationError('invalid-credentials', 'Email or password is incorrect.'),
    });
    let result: { signIn: (credentials: { email: string; password: string }) => Promise<void> };

    function ActionsProbe(): React.JSX.Element {
      result = useAuth();
      return <AuthProbe />;
    }

    let tree: ReactTestRenderer | undefined;
    act(() => {
      tree = TestRenderer.create(
        <AuthProvider repository={repository}>
          <ActionsProbe />
        </AuthProvider>,
      );
    });

    await expect(
      act(async () => {
        await result!.signIn({ email: 'quizzer@example.com', password: 'wrong' });
      }),
    ).rejects.toMatchObject({
      name: 'AuthenticationError',
      code: 'invalid-credentials',
    });

    expect(tree!.root.findByProps({ testID: 'auth-status' }).props.children).toBe(
      'unauthenticated',
    );
  });

  it('becomes authenticated after sign-up without profile fields', async () => {
    const repository = createAuthRepositoryFake();
    let result: ReturnType<typeof useAuth>;

    function ActionsProbe(): React.JSX.Element {
      result = useAuth();
      return <AuthProbe />;
    }

    let tree: ReactTestRenderer | undefined;
    act(() => {
      tree = TestRenderer.create(
        <AuthProvider repository={repository}>
          <ActionsProbe />
        </AuthProvider>,
      );
    });

    await act(async () => {
      await result!.signUp({ email: 'new@example.com', password: 'secret' });
    });

    expect(tree!.root.findByProps({ testID: 'auth-status' }).props.children).toBe('authenticated');
    expect(tree!.root.findByProps({ testID: 'auth-email' }).props.children).toBe('new@example.com');
    expect(repository.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'secret',
    });
  });

  it('returns to unauthenticated after sign-out', async () => {
    const repository = createAuthRepositoryFake();
    let result: {
      signIn: (credentials: { email: string; password: string }) => Promise<void>;
      signOut: () => Promise<void>;
    };

    function ActionsProbe(): React.JSX.Element {
      result = useAuth();
      return <AuthProbe />;
    }

    let tree: ReactTestRenderer | undefined;
    act(() => {
      tree = TestRenderer.create(
        <AuthProvider repository={repository}>
          <ActionsProbe />
        </AuthProvider>,
      );
    });

    await act(async () => {
      await result!.signIn({ email: 'quizzer@example.com', password: 'secret' });
    });
    await act(async () => {
      await result!.signOut();
    });

    expect(tree!.root.findByProps({ testID: 'auth-status' }).props.children).toBe(
      'unauthenticated',
    );
    expect(tree!.root.findByProps({ testID: 'auth-email' }).props.children).toBe('');
  });

  it('sends a password reset without changing session', async () => {
    const repository = createAuthRepositoryFake();
    let result: { sendPasswordResetEmail: (email: string) => Promise<void> };

    function ActionsProbe(): React.JSX.Element {
      result = useAuth();
      return <AuthProbe />;
    }

    let tree: ReactTestRenderer | undefined;
    act(() => {
      tree = TestRenderer.create(
        <AuthProvider repository={repository}>
          <ActionsProbe />
        </AuthProvider>,
      );
    });

    await act(async () => {
      await result!.sendPasswordResetEmail('quizzer@example.com');
    });

    expect(repository.sendPasswordResetEmail).toHaveBeenCalledWith('quizzer@example.com');
    expect(tree!.root.findByProps({ testID: 'auth-status' }).props.children).toBe(
      'unauthenticated',
    );
  });

  it('surfaces password-reset failures without changing session', async () => {
    const repository = createAuthRepositoryFake({
      resetError: new AuthenticationError('network-unavailable', 'Unable to reach the authentication service. Check your connection.'),
    });
    let result: { sendPasswordResetEmail: (email: string) => Promise<void> };

    function ActionsProbe(): React.JSX.Element {
      result = useAuth();
      return <AuthProbe />;
    }

    let tree: ReactTestRenderer | undefined;
    act(() => {
      tree = TestRenderer.create(
        <AuthProvider repository={repository}>
          <ActionsProbe />
        </AuthProvider>,
      );
    });

    await expect(
      act(async () => {
        await result!.sendPasswordResetEmail('quizzer@example.com');
      }),
    ).rejects.toMatchObject({
      name: 'AuthenticationError',
      code: 'network-unavailable',
    });

    expect(tree!.root.findByProps({ testID: 'auth-status' }).props.children).toBe(
      'unauthenticated',
    );
  });
});
