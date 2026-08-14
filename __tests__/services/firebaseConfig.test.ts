import {
  FIREBASE_CLIENT_ENV_KEYS,
  FirebaseNotConfiguredError,
  readFirebaseClientConfig,
} from '../../src/services/firebase/firebaseConfig';

const completeEnv = {
  [FIREBASE_CLIENT_ENV_KEYS.apiKey]: 'test-api-key',
  [FIREBASE_CLIENT_ENV_KEYS.authDomain]: 'ignite-test.firebaseapp.com',
  [FIREBASE_CLIENT_ENV_KEYS.projectId]: 'ignite-test',
  [FIREBASE_CLIENT_ENV_KEYS.storageBucket]: 'ignite-test.appspot.com',
  [FIREBASE_CLIENT_ENV_KEYS.messagingSenderId]: '123456789',
  [FIREBASE_CLIENT_ENV_KEYS.appId]: '1:123456789:web:abc',
};

describe('readFirebaseClientConfig', () => {
  it('maps Expo public env vars onto the Firebase JS SDK config object', () => {
    expect(readFirebaseClientConfig(completeEnv)).toEqual({
      apiKey: 'test-api-key',
      authDomain: 'ignite-test.firebaseapp.com',
      projectId: 'ignite-test',
      storageBucket: 'ignite-test.appspot.com',
      messagingSenderId: '123456789',
      appId: '1:123456789:web:abc',
    });
  });

  it('throws FirebaseNotConfiguredError listing missing keys', () => {
    expect(() => readFirebaseClientConfig({})).toThrow(FirebaseNotConfiguredError);
    try {
      readFirebaseClientConfig({
        [FIREBASE_CLIENT_ENV_KEYS.apiKey]: 'only-key',
      });
    } catch (error) {
      expect(error).toBeInstanceOf(FirebaseNotConfiguredError);
      expect((error as FirebaseNotConfiguredError).missingKeys).toEqual([
        FIREBASE_CLIENT_ENV_KEYS.authDomain,
        FIREBASE_CLIENT_ENV_KEYS.projectId,
        FIREBASE_CLIENT_ENV_KEYS.storageBucket,
        FIREBASE_CLIENT_ENV_KEYS.messagingSenderId,
        FIREBASE_CLIENT_ENV_KEYS.appId,
      ]);
      return;
    }
    throw new Error('expected FirebaseNotConfiguredError');
  });

  it('treats blank values as missing', () => {
    expect(() =>
      readFirebaseClientConfig({
        ...completeEnv,
        [FIREBASE_CLIENT_ENV_KEYS.projectId]: '   ',
      }),
    ).toThrow(/EXPO_PUBLIC_FIREBASE_PROJECT_ID/);
  });
});
