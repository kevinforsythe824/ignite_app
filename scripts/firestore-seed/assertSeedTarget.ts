import { IGNITE_ENV_KEY } from '../../src/services/firebase/firebaseEnvironments';

export class SeedTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedTargetError';
  }
}

/**
 * Intentional fail-closed leftover from the retired live seed.
 * There is no valid Firebase target. This always throws, never opens a client,
 * and must not be changed to return a project id. Live curriculum writes use
 * the content import pipeline.
 */
export function resolveSeedTarget(
  env: Record<string, string | undefined>,
): never {
  const environment = env[IGNITE_ENV_KEY]?.trim() || 'unset';
  throw new SeedTargetError(
    `Refusing legacy live Firestore seed for "${environment}". seasons/test-season is no longer written for DEV, STAGING, or PROD. Use the content import pipeline for curriculum.`,
  );
}
