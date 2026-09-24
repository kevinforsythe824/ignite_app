/**
 * @jest-environment node
 */
import {
  FIREBASE_CLIENT_ENV_KEYS,
} from '../../src/services/firebase/firebaseConfig';
import {
  IGNITE_ENV_KEY,
  IGNITE_FIREBASE_PROJECTS,
} from '../../src/services/firebase/firebaseEnvironments';
import {
  ContentImportEnvironmentError,
  assertDevImportEnvironment,
} from '../../scripts/content-import/environmentGate';
import { executeContentImport } from '../../scripts/content-import/executeImport';

const SYNTHETIC_PACKAGE = 'content/packages/dev-synthetic-s3';

function devEnv(projectId: string = IGNITE_FIREBASE_PROJECTS.dev) {
  return {
    [IGNITE_ENV_KEY]: 'dev',
    [FIREBASE_CLIENT_ENV_KEYS.projectId]: projectId,
  };
}

describe('assertDevImportEnvironment', () => {
  it('accepts DEV with the configured DEV project id', () => {
    expect(assertDevImportEnvironment(devEnv())).toEqual({
      environment: 'dev',
      projectId: IGNITE_FIREBASE_PROJECTS.dev,
    });
  });

  it('rejects a missing environment', () => {
    expect(() => assertDevImportEnvironment({})).toThrow(ContentImportEnvironmentError);
    expect(() => assertDevImportEnvironment({})).toThrow(IGNITE_ENV_KEY);
  });

  it('rejects staging', () => {
    expect(() =>
      assertDevImportEnvironment({
        [IGNITE_ENV_KEY]: 'staging',
        [FIREBASE_CLIENT_ENV_KEYS.projectId]: IGNITE_FIREBASE_PROJECTS.staging,
      }),
    ).toThrow(/DEV-only/);
  });

  it('rejects prod', () => {
    expect(() =>
      assertDevImportEnvironment({
        [IGNITE_ENV_KEY]: 'prod',
        [FIREBASE_CLIENT_ENV_KEYS.projectId]: IGNITE_FIREBASE_PROJECTS.prod,
      }),
    ).toThrow(/DEV-only/);
  });

  it('rejects a missing project id', () => {
    expect(() =>
      assertDevImportEnvironment({ [IGNITE_ENV_KEY]: 'dev' }),
    ).toThrow(FIREBASE_CLIENT_ENV_KEYS.projectId);
  });

  it('rejects a project id that is not the DEV project', () => {
    expect(() => assertDevImportEnvironment(devEnv('not-the-dev-project'))).toThrow(
      /project mismatch|DEV project/i,
    );
  });
});

describe('DEV gate before reader initialization', () => {
  it('does not open a reader when the environment gate fails', async () => {
    const openReader = jest.fn(() => {
      throw new Error('reader initialized');
    });
    const stdout = jest.fn();
    const stderr = jest.fn();

    const code = await executeContentImport({
      packageDir: SYNTHETIC_PACKAGE,
      mode: 'dev-diff',
      env: {},
      stdout,
      stderr,
      openReader,
    });

    expect(code).toBe(1);
    expect(openReader).not.toHaveBeenCalled();
    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).toHaveBeenCalled();
  });
});
