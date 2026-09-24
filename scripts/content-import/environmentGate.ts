import { FIREBASE_CLIENT_ENV_KEYS } from '../../src/services/firebase/firebaseConfig';
import {
  FirebaseEnvironmentError,
  IGNITE_ENV_KEY,
  IGNITE_FIREBASE_PROJECTS,
  assertProjectIdForEnvironment,
  readIgniteEnvironment,
} from '../../src/services/firebase/firebaseEnvironments';

export class ContentImportEnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentImportEnvironmentError';
  }
}

export interface DevImportEnvironment {
  environment: 'dev';
  projectId: string;
}

function readConfiguredProjectId(
  env: Record<string, string | undefined>,
): string | undefined {
  const value = env[FIREBASE_CLIENT_ENV_KEYS.projectId]?.trim();
  return value === undefined || value.length === 0 ? undefined : value;
}

/**
 * DEV-only gate. Uses Ignite environment and the configured project id.
 * Does not consult the Firebase CLI alias and does not open a client.
 */
export function assertDevImportEnvironment(
  env: Record<string, string | undefined>,
): DevImportEnvironment {
  let environment;
  try {
    environment = readIgniteEnvironment(env);
  } catch (error) {
    const message =
      error instanceof FirebaseEnvironmentError
        ? error.message
        : 'Invalid Ignite environment.';
    throw new ContentImportEnvironmentError(message);
  }

  if (environment !== 'dev') {
    throw new ContentImportEnvironmentError(
      `Content import diff is DEV-only. ${IGNITE_ENV_KEY}=${environment} is not allowed. STAGING and PROD are unsupported.`,
    );
  }

  const projectId = readConfiguredProjectId(env);
  if (!projectId) {
    throw new ContentImportEnvironmentError(
      `Missing ${FIREBASE_CLIENT_ENV_KEYS.projectId}.`,
    );
  }

  try {
    assertProjectIdForEnvironment(environment, projectId);
  } catch (error) {
    const message =
      error instanceof FirebaseEnvironmentError
        ? error.message
        : 'Firebase project mismatch.';
    throw new ContentImportEnvironmentError(message);
  }

  const expectedDevProjectId = IGNITE_FIREBASE_PROJECTS.dev;
  if (projectId !== expectedDevProjectId) {
    throw new ContentImportEnvironmentError(
      `Content import diff requires the DEV project "${expectedDevProjectId}".`,
    );
  }

  return { environment: 'dev', projectId: expectedDevProjectId };
}
