import { render } from '@testing-library/react-native';
import React from 'react';

import App from '../App';

jest.mock('../src/features/flashcards/repositories/firebaseCurriculumSource', () => {
  const { jsonCurriculumRepository } = jest.requireActual(
    '../src/features/flashcards/repositories/jsonCurriculumRepository',
  ) as typeof import('../src/features/flashcards/repositories/jsonCurriculumRepository');

  return {
    createFirebaseCurriculumSource: jest.fn(),
    firestoreCurriculumRepository: jsonCurriculumRepository,
  };
});

jest.mock('../src/features/auth', () => {
  const React = require('react');
  const actual = jest.requireActual('../src/features/auth') as typeof import('../src/features/auth');

  const identity = {
    uid: 'app-test-user',
    email: 'quizzer@example.com',
    emailVerified: false,
  };

  function AuthenticatedAuthProvider({ children }: { children: React.ReactNode }) {
    const repository = {
      getCurrentUser: () => identity,
      signIn: async () => identity,
      signUp: async () => identity,
      signOut: async () => undefined,
      sendPasswordResetEmail: async () => undefined,
      onAuthStateChanged: (listener: (next: typeof identity | null) => void) => {
        listener(identity);
        return () => undefined;
      },
    };

    return React.createElement(actual.AuthProvider, { repository }, children);
  }

  return {
    ...actual,
    AuthProvider: AuthenticatedAuthProvider,
  };
});

jest.mock('../src/features/profile/repositories', () => {
  const profile = {
    quizzerId: 'app-test-user',
    firstName: 'App',
    lastName: 'Tester',
    avatarId: null,
  };

  return {
    firestoreQuizzerProfileRepository: {
      getProfile: jest.fn(async () => profile),
      provisionProfile: jest.fn(async () => profile),
    },
    FirestoreQuizzerProfileRepository: jest.fn(),
    createFirebaseQuizzerProfileSource: jest.fn(),
  };
});

describe('App', () => {
  it('renders the Luke 2 deck title and first verse reference when authenticated', async () => {
    const { findByText } = await render(<App />);

    expect(await findByText('Luke 2:1-9')).toBeTruthy();
    expect(await findByText('Luke 2:1')).toBeTruthy();
  });
});
