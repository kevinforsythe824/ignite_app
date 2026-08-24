/**
 * Server environment detection for parental-consent Functions.
 * Mirrors mobile firebaseEnvironments project IDs — never invents a prod default.
 */

export const IGNITE_ENVIRONMENT_NAMES = ['dev', 'staging', 'prod'] as const;

export type IgniteEnvironmentName = (typeof IGNITE_ENVIRONMENT_NAMES)[number];

export const IGNITE_FIREBASE_PROJECTS = {
  dev: 'wpf-bible-qizzing',
  staging: 'ignite-staging-01',
  prod: 'ignite-prod-01',
} as const satisfies Record<IgniteEnvironmentName, string>;

export function isIgniteEnvironmentName(
  value: string,
): value is IgniteEnvironmentName {
  return (IGNITE_ENVIRONMENT_NAMES as readonly string[]).includes(value);
}

/** Process env shape used by guards — intentionally loose for unit tests. */
export type EnvLike = Record<string, string | undefined>;

/**
 * Emulator / explicit test contexts may omit a resolvable project ID.
 * Deployed Functions must fail closed when project identity is unknown.
 */
export function isEmulatorOrConsentTestContext(
  env: EnvLike = process.env,
): boolean {
  return (
    env.FUNCTIONS_EMULATOR === 'true' ||
    Boolean(env.FIRESTORE_EMULATOR_HOST?.trim()) ||
    Boolean(env.FIREBASE_AUTH_EMULATOR_HOST?.trim()) ||
    env.IGNITE_CONSENT_TEST_MODE === 'true'
  );
}

export function readIgniteEnvironment(
  env: EnvLike = process.env,
): IgniteEnvironmentName {
  const value = env.IGNITE_ENV?.trim();
  if (!value) {
    // Emulator / local default is DEV only — never production.
    if (isEmulatorOrConsentTestContext(env) || env.FIREBASE_CONFIG === undefined) {
      return 'dev';
    }
    throw new Error('Missing IGNITE_ENV. Set to dev, staging, or prod.');
  }
  if (!isIgniteEnvironmentName(value)) {
    throw new Error(`Invalid IGNITE_ENV="${value}". Expected dev, staging, or prod.`);
  }
  return value;
}

export function assertProjectMatchesEnvironment(
  environment: IgniteEnvironmentName,
  projectId: string | undefined,
  env: EnvLike = process.env,
): void {
  if (!projectId || projectId.trim().length === 0) {
    if (isEmulatorOrConsentTestContext(env)) {
      return;
    }
    throw new Error(
      `Missing Firebase project ID while IGNITE_ENV=${environment}. Refusing to continue.`,
    );
  }
  const expected = IGNITE_FIREBASE_PROJECTS[environment];
  if (projectId !== expected) {
    throw new Error(
      `Firebase project mismatch: IGNITE_ENV=${environment} requires "${expected}" but project is "${projectId}".`,
    );
  }
}

export function resolveActiveProjectId(
  env: EnvLike = process.env,
): string | undefined {
  if (env.GCLOUD_PROJECT) {
    return env.GCLOUD_PROJECT;
  }
  if (env.GCP_PROJECT) {
    return env.GCP_PROJECT;
  }
  if (env.FIREBASE_CONFIG) {
    try {
      const parsed = JSON.parse(env.FIREBASE_CONFIG) as { projectId?: string };
      return parsed.projectId;
    } catch {
      return undefined;
    }
  }
  return undefined;
}
