import {
  IGNITE_ENV_KEY,
  IGNITE_FIREBASE_PROJECTS,
} from '../../src/services/firebase/firebaseEnvironments';
import {
  resolveSeedTarget,
  SeedTargetError,
} from '../../scripts/firestore-seed/assertSeedTarget';

describe('resolveSeedTarget', () => {
  it('refuses development because the live seed is retired', () => {
    expect(() =>
      resolveSeedTarget({
        [IGNITE_ENV_KEY]: 'dev',
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.dev,
      }),
    ).toThrow(SeedTargetError);
    expect(() =>
      resolveSeedTarget({
        [IGNITE_ENV_KEY]: 'dev',
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.dev,
      }),
    ).toThrow(/no longer written/);
  });

  it('refuses staging', () => {
    expect(() =>
      resolveSeedTarget({
        [IGNITE_ENV_KEY]: 'staging',
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.staging,
      }),
    ).toThrow(/staging/);
  });

  it('refuses production, including a former override flag', () => {
    expect(() =>
      resolveSeedTarget({
        [IGNITE_ENV_KEY]: 'prod',
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.prod,
        IGNITE_ALLOW_PROD_SEED: '1',
      }),
    ).toThrow(/prod/);
  });

  it('refuses a project id that does not match the named environment', () => {
    expect(() =>
      resolveSeedTarget({
        [IGNITE_ENV_KEY]: 'dev',
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.prod,
      }),
    ).toThrow(SeedTargetError);
  });
});
