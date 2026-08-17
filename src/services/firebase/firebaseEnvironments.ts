/**
 * Named Ignite backend environments and their Firebase project IDs.
 * These IDs are public project identifiers, not credentials.
 */

export const IGNITE_ENV_KEY = 'EXPO_PUBLIC_IGNITE_ENV';

export const IGNITE_ENVIRONMENT_NAMES = ['dev', 'staging', 'prod'] as const;

export type IgniteEnvironmentName = (typeof IGNITE_ENVIRONMENT_NAMES)[number];

export const IGNITE_FIREBASE_PROJECTS = {
  dev: 'wpf-bible-qizzing',
  staging: 'ignite-staging-01',
  prod: 'ignite-prod-01',
} as const satisfies Record<IgniteEnvironmentName, string>;

export const IGNITE_ENVIRONMENT_LABELS = {
  dev: 'Development',
  staging: 'Staging',
  prod: 'Production',
} as const satisfies Record<IgniteEnvironmentName, string>;

export class FirebaseEnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FirebaseEnvironmentError';
  }
}

export function isIgniteEnvironmentName(
  value: string,
): value is IgniteEnvironmentName {
  return (IGNITE_ENVIRONMENT_NAMES as readonly string[]).includes(value);
}

export function expectedProjectIdFor(
  environment: IgniteEnvironmentName,
): string {
  return IGNITE_FIREBASE_PROJECTS[environment];
}

export function readIgniteEnvironment(
  env: Record<string, string | undefined> = process.env,
): IgniteEnvironmentName {
  const value = env[IGNITE_ENV_KEY]?.trim();
  if (value === undefined || value.length === 0) {
    throw new FirebaseEnvironmentError(
      `Missing ${IGNITE_ENV_KEY}. Set it to dev, staging, or prod. Ignite never defaults to production.`,
    );
  }
  if (!isIgniteEnvironmentName(value)) {
    throw new FirebaseEnvironmentError(
      `Invalid ${IGNITE_ENV_KEY}="${value}". Expected dev, staging, or prod.`,
    );
  }
  return value;
}

export function assertProjectIdForEnvironment(
  environment: IgniteEnvironmentName,
  projectId: string,
): void {
  const expected = expectedProjectIdFor(environment);
  if (projectId !== expected) {
    throw new FirebaseEnvironmentError(
      `Firebase project mismatch: ${IGNITE_ENV_KEY}=${environment} requires "${expected}" but EXPO_PUBLIC_FIREBASE_PROJECT_ID="${projectId}".`,
    );
  }
}
