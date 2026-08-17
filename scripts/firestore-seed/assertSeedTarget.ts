import {
  IGNITE_ENV_KEY,
  assertProjectIdForEnvironment,
  expectedProjectIdFor,
  readIgniteEnvironment,
  type IgniteEnvironmentName,
} from '../../src/services/firebase/firebaseEnvironments';

export class SeedTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedTargetError';
  }
}

export interface SeedTarget {
  environment: IgniteEnvironmentName;
  projectId: string;
}

export function resolveSeedTarget(
  env: Record<string, string | undefined>,
): SeedTarget {
  const environment = readIgniteEnvironment(env);
  const expectedProjectId = expectedProjectIdFor(environment);
  const configuredProjectId =
    env.FIREBASE_PROJECT_ID?.trim() ||
    env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim();

  if (!configuredProjectId) {
    throw new SeedTargetError(
      `Missing FIREBASE_PROJECT_ID (or EXPO_PUBLIC_FIREBASE_PROJECT_ID). Expected ${expectedProjectId} for ${IGNITE_ENV_KEY}=${environment}.`,
    );
  }

  assertProjectIdForEnvironment(environment, configuredProjectId);

  if (environment === 'prod') {
    throw new SeedTargetError(
      `Refusing to seed production (${expectedProjectId}). The development/test seed script cannot target prod. Official season publishing is a separate workflow.`,
    );
  }

  return { environment, projectId: configuredProjectId };
}
