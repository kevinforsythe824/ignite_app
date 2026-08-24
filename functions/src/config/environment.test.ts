import {
  assertProjectMatchesEnvironment,
  isEmulatorOrConsentTestContext,
  readIgniteEnvironment,
} from './environment';

describe('environment guards', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    delete process.env.IGNITE_ENV;
    delete process.env.FUNCTIONS_EMULATOR;
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    delete process.env.IGNITE_CONSENT_TEST_MODE;
    delete process.env.FIREBASE_CONFIG;
    delete process.env.GCLOUD_PROJECT;
  });

  it('accepts matching DEV project', () => {
    expect(() =>
      assertProjectMatchesEnvironment('dev', 'wpf-bible-qizzing'),
    ).not.toThrow();
  });

  it('rejects mismatched project', () => {
    expect(() =>
      assertProjectMatchesEnvironment('dev', 'ignite-prod-01'),
    ).toThrow(/project mismatch/);
  });

  it('fails closed when project is missing outside emulator/test', () => {
    delete process.env.FUNCTIONS_EMULATOR;
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    delete process.env.IGNITE_CONSENT_TEST_MODE;
    expect(() => assertProjectMatchesEnvironment('dev', undefined)).toThrow(
      /Missing Firebase project ID/,
    );
    expect(() => assertProjectMatchesEnvironment('dev', '   ')).toThrow(
      /Missing Firebase project ID/,
    );
  });

  it('allows missing project in emulator or explicit test mode', () => {
    process.env.FUNCTIONS_EMULATOR = 'true';
    expect(() => assertProjectMatchesEnvironment('dev', undefined)).not.toThrow();

    delete process.env.FUNCTIONS_EMULATOR;
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    expect(() => assertProjectMatchesEnvironment('dev', undefined)).not.toThrow();

    delete process.env.FIRESTORE_EMULATOR_HOST;
    process.env.IGNITE_CONSENT_TEST_MODE = 'true';
    expect(() => assertProjectMatchesEnvironment('dev', undefined)).not.toThrow();
  });

  it('still validates mismatch even in emulator context', () => {
    process.env.FUNCTIONS_EMULATOR = 'true';
    expect(() =>
      assertProjectMatchesEnvironment('dev', 'ignite-staging-01'),
    ).toThrow(/project mismatch/);
  });

  it('detects emulator/test context', () => {
    expect(isEmulatorOrConsentTestContext({})).toBe(false);
    expect(
      isEmulatorOrConsentTestContext({ FUNCTIONS_EMULATOR: 'true' }),
    ).toBe(true);
  });

  it('defaults IGNITE_ENV to dev in emulator when unset', () => {
    process.env.FUNCTIONS_EMULATOR = 'true';
    delete process.env.IGNITE_ENV;
    expect(readIgniteEnvironment()).toBe('dev');
  });
});
