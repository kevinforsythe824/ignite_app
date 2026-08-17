import {
  FirebaseEnvironmentError,
  IGNITE_ENV_KEY,
  IGNITE_FIREBASE_PROJECTS,
  readIgniteEnvironment,
} from '../../src/services/firebase/firebaseEnvironments';

describe('readIgniteEnvironment', () => {
  it('reads a valid named environment', () => {
    expect(readIgniteEnvironment({ [IGNITE_ENV_KEY]: 'dev' })).toBe('dev');
    expect(readIgniteEnvironment({ [IGNITE_ENV_KEY]: 'staging' })).toBe('staging');
    expect(readIgniteEnvironment({ [IGNITE_ENV_KEY]: 'prod' })).toBe('prod');
  });

  it('refuses an empty value instead of defaulting to prod', () => {
    expect(() => readIgniteEnvironment({})).toThrow(FirebaseEnvironmentError);
    expect(() => readIgniteEnvironment({ [IGNITE_ENV_KEY]: '   ' })).toThrow(
      /never defaults to production/,
    );
  });

  it('rejects unknown environment names', () => {
    expect(() => readIgniteEnvironment({ [IGNITE_ENV_KEY]: 'production' })).toThrow(
      /Expected dev, staging, or prod/,
    );
  });
});

describe('IGNITE_FIREBASE_PROJECTS', () => {
  it('maps the three named environments to the configured project ids', () => {
    expect(IGNITE_FIREBASE_PROJECTS).toEqual({
      dev: 'wpf-bible-qizzing',
      staging: 'ignite-staging-01',
      prod: 'ignite-prod-01',
    });
  });
});
