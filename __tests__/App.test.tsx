import { render } from '@testing-library/react-native';
import React from 'react';

import App from '../App';

jest.mock('../src/features/flashcards/repositories/firebaseCurriculumSource', () => {
  const { temporaryStudyFixtureRepository } = jest.requireActual(
    '../test-utils/temporaryStudyFixtureRepository',
  ) as typeof import('../test-utils/temporaryStudyFixtureRepository');

  return {
    createFirebaseCurriculumSource: jest.fn(),
    firestoreCurriculumRepository: temporaryStudyFixtureRepository,
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
      changeEmail: async () => undefined,
      changePassword: async () => undefined,
      refreshIdentity: async () => identity,
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
      updateName: jest.fn(async () => profile),
    },
    FirestoreQuizzerProfileRepository: jest.fn(),
    createFirebaseQuizzerProfileSource: jest.fn(),
  };
});

/** Shell fixture. Production Study uses the real Season session, not this target. */
jest.mock('../src/features/season/state/SeasonParticipationProvider', () => {
  const React = require('react');
  const session = {
    status: 'ready',
    quizzerId: 'app-test-user',
    calendarDate: '2026-10-03',
    season: {
      seasonId: '2027',
      name: 'Fixture season',
      startDate: '2026-09-01',
      endDate: '2027-07-31',
      status: 'published',
      igniteAvailabilityDate: '2026-09-01',
    },
    participation: {
      quizzerId: 'app-test-user',
      seasonId: '2027',
      regionId: 'northwest',
      readiness: 'ready',
      participationType: 'competitive',
      divisionId: 'beginner',
    },
    studyTarget: {
      seasonId: '2027',
      materialSetId: 'beginner-2027',
    },
  };

  return {
    SeasonParticipationProvider: ({ children }: { children: React.ReactNode }) => children,
    useSeasonParticipation: () => ({
      session,
      refresh: async () => undefined,
      acceptParticipationReady: async () => undefined,
    }),
  };
});

describe('App', () => {
  it('renders the Luke 2 deck title and first verse reference when authenticated', async () => {
    const { findByText } = await render(<App />);

    expect(await findByText('Luke 2:1-9')).toBeTruthy();
    expect(await findByText('Luke 2:1')).toBeTruthy();
  });
});
