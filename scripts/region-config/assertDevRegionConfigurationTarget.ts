import {
  FirebaseEnvironmentError,
  IGNITE_FIREBASE_PROJECTS,
  assertProjectIdForEnvironment,
  readIgniteEnvironment,
  type IgniteEnvironmentName,
} from '../../src/services/firebase/firebaseEnvironments';

import { RegionConfigurationError } from './planOfficialRegionConfiguration';

export interface DevRegionConfigurationTarget {
  environment: 'dev';
  projectId: string;
}

function configuredProjectId(env: Record<string, string | undefined>): string | undefined {
  const fromFirebase = env.FIREBASE_PROJECT_ID?.trim();
  const fromExpo = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (fromFirebase && fromExpo && fromFirebase !== fromExpo) {
    throw new RegionConfigurationError(
      'FIREBASE_PROJECT_ID and EXPO_PUBLIC_FIREBASE_PROJECT_ID do not agree.',
    );
  }
  const projectId = fromFirebase || fromExpo;
  return projectId && projectId.length > 0 ? projectId : undefined;
}

/**
 * DEV-only gate for official Region configuration.
 * Refuses STAGING and PROD. Does not infer the environment from a hostname.
 * Does not open a Firebase client.
 */
export function assertDevRegionConfigurationTarget(
  env: Record<string, string | undefined>,
): DevRegionConfigurationTarget {
  let environment: IgniteEnvironmentName;
  try {
    environment = readIgniteEnvironment(env);
  } catch (error) {
    const message =
      error instanceof FirebaseEnvironmentError
        ? error.message
        : 'Invalid Ignite environment.';
    throw new RegionConfigurationError(message);
  }

  if (environment === 'prod') {
    throw new RegionConfigurationError(
      `Refusing official Region configuration for production (${IGNITE_FIREBASE_PROJECTS.prod}).`,
    );
  }
  if (environment === 'staging') {
    throw new RegionConfigurationError(
      `Refusing official Region configuration for staging (${IGNITE_FIREBASE_PROJECTS.staging}). This Phase 3 workflow is DEV-only.`,
    );
  }

  const projectId = configuredProjectId(env);
  if (!projectId) {
    throw new RegionConfigurationError(
      `Missing FIREBASE_PROJECT_ID (or EXPO_PUBLIC_FIREBASE_PROJECT_ID). Expected ${IGNITE_FIREBASE_PROJECTS.dev}.`,
    );
  }

  try {
    assertProjectIdForEnvironment(environment, projectId);
  } catch (error) {
    const message =
      error instanceof FirebaseEnvironmentError ? error.message : 'Firebase project mismatch.';
    throw new RegionConfigurationError(message);
  }

  return { environment: 'dev', projectId: IGNITE_FIREBASE_PROJECTS.dev };
}
