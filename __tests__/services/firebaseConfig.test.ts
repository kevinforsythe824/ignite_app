import {
  FIREBASE_CLIENT_ENV_KEYS,
  FirebaseNotConfiguredError,
  readFirebaseClientConfig,
} from '../../src/services/firebase/firebaseConfig';
import {
  FirebaseEnvironmentError,
  IGNITE_ENV_KEY,
  IGNITE_FIREBASE_PROJECTS,
} from '../../src/services/firebase/firebaseEnvironments';

const completeEnv = {
  [IGNITE_ENV_KEY]: 'dev',
  [FIREBASE_CLIENT_ENV_KEYS.apiKey]: 'test-api-key',
  [FIREBASE_CLIENT_ENV_KEYS.authDomain]: 'wpf-bible-qizzing.firebaseapp.com',
  [FIREBASE_CLIENT_ENV_KEYS.projectId]: IGNITE_FIREBASE_PROJECTS.dev,
  [FIREBASE_CLIENT_ENV_KEYS.storageBucket]: 'wpf-bible-qizzing.firebasestorage.app',
  [FIREBASE_CLIENT_ENV_KEYS.messagingSenderId]: '123456789',
  [FIREBASE_CLIENT_ENV_KEYS.appId]: '1:123456789:web:abc',
};

describe('readFirebaseClientConfig', () => {
  it('maps Expo public env vars onto the Firebase JS SDK config object', () => {
    expect(readFirebaseClientConfig(completeEnv)).toEqual({
      apiKey: 'test-api-key',
      authDomain: 'wpf-bible-qizzing.firebaseapp.com',
      projectId: IGNITE_FIREBASE_PROJECTS.dev,
      storageBucket: 'wpf-bible-qizzing.firebasestorage.app',
      messagingSenderId: '123456789',
      appId: '1:123456789:web:abc',
    });
  });

  it('throws FirebaseNotConfiguredError listing missing keys', () => {
    const envOnly = { [IGNITE_ENV_KEY]: 'dev' };
    expect(() => readFirebaseClientConfig(envOnly)).toThrow(FirebaseNotConfiguredError);
    try {
      readFirebaseClientConfig({
        [IGNITE_ENV_KEY]: 'dev',
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

  it('does not default a missing environment to production', () => {
    const { [IGNITE_ENV_KEY]: _ignored, ...withoutEnv } = completeEnv;
    expect(() => readFirebaseClientConfig(withoutEnv)).toThrow(FirebaseEnvironmentError);
    expect(() => readFirebaseClientConfig(withoutEnv)).toThrow(/never defaults to production/);
  });

  it('rejects a project id that does not match the named environment', () => {
    expect(() =>
      readFirebaseClientConfig({
        ...completeEnv,
        [IGNITE_ENV_KEY]: 'staging',
      }),
    ).toThrow(FirebaseEnvironmentError);
  });

  it('accepts staging when the project id is ignite-staging-01', () => {
    expect(
      readFirebaseClientConfig({
        ...completeEnv,
        [IGNITE_ENV_KEY]: 'staging',
        [FIREBASE_CLIENT_ENV_KEYS.projectId]: IGNITE_FIREBASE_PROJECTS.staging,
      }).projectId,
    ).toBe(IGNITE_FIREBASE_PROJECTS.staging);
  });
});
