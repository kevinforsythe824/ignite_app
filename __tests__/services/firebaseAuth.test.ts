import type { FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';

import { getFirebaseApp } from '../../src/services/firebase/firebaseApp';
import {
  getFirebaseAuth,
  resetFirebaseAuthForTests,
} from '../../src/services/firebase/firebaseAuth';

jest.mock('../../src/services/firebase/firebaseApp', () => ({
  getFirebaseApp: jest.fn(),
}));

const mockGetFirebaseApp = getFirebaseApp as jest.MockedFunction<typeof getFirebaseApp>;
const mockInitializeAuth = initializeAuth as jest.MockedFunction<typeof initializeAuth>;
const mockGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;

const fakeApp = { name: '[DEFAULT]' } as FirebaseApp;
const fakeAuth = { currentUser: null };

describe('getFirebaseAuth', () => {
  beforeEach(() => {
    resetFirebaseAuthForTests();
    mockGetFirebaseApp.mockReset();
    mockInitializeAuth.mockReset();
    mockGetAuth.mockReset();
    mockGetFirebaseApp.mockReturnValue(fakeApp);
  });

  it('initializes auth once with React Native persistence', () => {
    mockInitializeAuth.mockReturnValue(fakeAuth as never);

    expect(getFirebaseAuth()).toBe(fakeAuth);
    expect(mockInitializeAuth).toHaveBeenCalledTimes(1);
    expect(mockInitializeAuth.mock.calls[0]?.[0]).toBe(fakeApp);
    expect(mockInitializeAuth.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ persistence: expect.anything() }),
    );
  });

  it('reuses the cached auth instance', () => {
    mockInitializeAuth.mockReturnValue(fakeAuth as never);

    expect(getFirebaseAuth()).toBe(getFirebaseAuth());
    expect(mockInitializeAuth).toHaveBeenCalledTimes(1);
  });

  it('falls back to getAuth when auth is already initialized', () => {
    mockInitializeAuth.mockImplementation(() => {
      const error = new Error('already initialized') as Error & { code: string };
      error.code = 'auth/already-initialized';
      throw error;
    });
    mockGetAuth.mockReturnValue(fakeAuth as never);

    expect(getFirebaseAuth()).toBe(fakeAuth);
    expect(mockGetAuth).toHaveBeenCalledWith(fakeApp);
  });
});
