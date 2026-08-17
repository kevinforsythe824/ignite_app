import {
  IGNITE_ENV_KEY,
  IGNITE_FIREBASE_PROJECTS,
} from '../../src/services/firebase/firebaseEnvironments';
import {
  resolveSeedTarget,
  SeedTargetError,
} from '../../scripts/firestore-seed/assertSeedTarget';

const devEnv = {
  [IGNITE_ENV_KEY]: 'dev',
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.dev,
};

describe('resolveSeedTarget', () => {
  it('allows seeding development when the project id matches', () => {
    expect(resolveSeedTarget(devEnv)).toEqual({
      environment: 'dev',
      projectId: IGNITE_FIREBASE_PROJECTS.dev,
    });
  });

  it('allows seeding staging when the project id matches', () => {
    expect(
      resolveSeedTarget({
        [IGNITE_ENV_KEY]: 'staging',
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.staging,
      }),
    ).toEqual({
      environment: 'staging',
      projectId: IGNITE_FIREBASE_PROJECTS.staging,
    });
  });

  it('always refuses production, including former override flags', () => {
    const prodEnv = {
      [IGNITE_ENV_KEY]: 'prod',
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.prod,
      IGNITE_ALLOW_PROD_SEED: '1',
    };
    expect(() => resolveSeedTarget(prodEnv)).toThrow(SeedTargetError);
    expect(() => resolveSeedTarget(prodEnv)).toThrow(/cannot target prod/);
  });

  it('rejects a project id that does not match the named environment', () => {
    expect(() =>
      resolveSeedTarget({
        [IGNITE_ENV_KEY]: 'dev',
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: IGNITE_FIREBASE_PROJECTS.prod,
      }),
    ).toThrow(/mismatch/);
  });
});
