import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';

import {
  AuthProvider,
  useAuth,
  type AuthRepository,
} from '../../../src/features/auth';

function AuthProbe(): React.JSX.Element {
  const { session } = useAuth();
  return <Text testID="auth-status">{session.status}</Text>;
}

function createRepository(
  overrides: Partial<AuthRepository> = {},
): AuthRepository {
  return {
    getCurrentUser: jest.fn(() => null),
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    onAuthStateChanged: jest.fn((listener) => {
      listener(null);
      return jest.fn();
    }),
    ...overrides,
  };
}

function renderAuthProbe(repository: AuthRepository): ReactTestRenderer {
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
    const tree = renderAuthProbe(createRepository());
    const statusNode = tree.root.findByProps({ testID: 'auth-status' });
    expect(statusNode.props.children).toBe('unauthenticated');
  });

  it('exposes authenticated session after auth-state callback', () => {
    const tree = renderAuthProbe(
      createRepository({
        onAuthStateChanged: jest.fn((listener) => {
          listener({
            uid: 'user-1',
            email: 'quizzer@example.com',
            emailVerified: false,
          });
          return jest.fn();
        }),
      }),
    );

    const statusNode = tree.root.findByProps({ testID: 'auth-status' });
    expect(statusNode.props.children).toBe('authenticated');
  });
});
