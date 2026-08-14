import type { FirebaseApp } from 'firebase/app';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

import {
  FIREBASE_CLIENT_ENV_KEYS,
  FirebaseNotConfiguredError,
} from '../../src/services/firebase/firebaseConfig';
import { getFirebaseApp } from '../../src/services/firebase/firebaseApp';
import { getFirebaseFirestore } from '../../src/services/firebase/firestore';

jest.mock('firebase/app', () => ({
  getApps: jest.fn(),
  initializeApp: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
}));

const mockGetApps = getApps as jest.MockedFunction<typeof getApps>;
const mockInitializeApp = initializeApp as jest.MockedFunction<typeof initializeApp>;
const mockGetFirestore = getFirestore as jest.MockedFunction<typeof getFirestore>;

const config = {
  apiKey: 'test-api-key',
  authDomain: 'ignite-test.firebaseapp.com',
  projectId: 'ignite-test',
  storageBucket: 'ignite-test.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abc',
};

const fakeApp = { name: '[DEFAULT]' } as FirebaseApp;
const fakeFirestore = { type: 'firestore' };

describe('Firebase JS SDK initialization', () => {
  beforeEach(() => {
    mockGetApps.mockReset();
    mockInitializeApp.mockReset();
    mockGetFirestore.mockReset();
  });

  it('initializes the Firebase app once from client config', () => {
    mockGetApps.mockReturnValue([]);
    mockInitializeApp.mockReturnValue(fakeApp);

    expect(getFirebaseApp(config)).toBe(fakeApp);
    expect(mockInitializeApp).toHaveBeenCalledTimes(1);
    expect(mockInitializeApp).toHaveBeenCalledWith(config);
  });

  it('reuses an existing Firebase app instead of initializing again', () => {
    mockGetApps.mockReturnValue([fakeApp]);

    expect(getFirebaseApp(config)).toBe(fakeApp);
    expect(mockInitializeApp).not.toHaveBeenCalled();
  });

  it('throws when no app exists and client config is missing', () => {
    mockGetApps.mockReturnValue([]);
    const envKeys = Object.values(FIREBASE_CLIENT_ENV_KEYS);
    const previous = envKeys.map((key) => [key, process.env[key]] as const);
    envKeys.forEach((key) => {
      delete process.env[key];
    });

    try {
      expect(() => getFirebaseApp()).toThrow(FirebaseNotConfiguredError);
      expect(mockInitializeApp).not.toHaveBeenCalled();
    } finally {
      previous.forEach(([key, value]) => {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      });
    }
  });

  it('exposes Firestore from the initialized Firebase app', () => {
    mockGetApps.mockReturnValue([fakeApp]);
    mockGetFirestore.mockReturnValue(fakeFirestore as never);

    expect(getFirebaseFirestore()).toBe(fakeFirestore);
    expect(mockGetFirestore).toHaveBeenCalledWith(fakeApp);
  });
});
