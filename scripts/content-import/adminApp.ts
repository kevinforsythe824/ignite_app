import { CONTENT_IMPORT_ADMIN_APP_NAME } from './constants';

export class ContentImportAdminAppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentImportAdminAppError';
  }
}

export interface NamedAdminAppHandle<TApp> {
  projectId: string | undefined;
  app: TApp;
}

export interface NamedAdminAppRegistry<TApp> {
  findNamed: (name: string) => NamedAdminAppHandle<TApp> | undefined;
  initializeNamed: (name: string, projectId: string) => NamedAdminAppHandle<TApp>;
}

/**
 * Resolves the dedicated content-import Admin app.
 * Never selects getApps()[0] or any unnamed default app.
 */
export function resolveNamedContentImportApp<TApp>(input: {
  expectedProjectId: string;
  registry: NamedAdminAppRegistry<TApp>;
  appName?: string;
}): TApp {
  const appName = input.appName ?? CONTENT_IMPORT_ADMIN_APP_NAME;
  const existing = input.registry.findNamed(appName);
  if (existing) {
    if (existing.projectId !== input.expectedProjectId) {
      throw new ContentImportAdminAppError(
        `Content import Admin app "${appName}" is already initialized for project "${existing.projectId ?? ''}", expected "${input.expectedProjectId}".`,
      );
    }
    return existing.app;
  }

  const created = input.registry.initializeNamed(appName, input.expectedProjectId);
  if (created.projectId !== input.expectedProjectId) {
    throw new ContentImportAdminAppError(
      `Content import Admin app "${appName}" initialized for project "${created.projectId ?? ''}", expected "${input.expectedProjectId}".`,
    );
  }
  return created.app;
}

/**
 * Production registry. Callers must pass the project id already verified as DEV.
 * Tests inject their own registry and do not call this.
 */
export async function createFirebaseAdminAppRegistry(): Promise<
  NamedAdminAppRegistry<unknown>
> {
  const { applicationDefault, getApps, initializeApp } = await import('firebase-admin/app');
  return {
    findNamed(name: string) {
      const existing = getApps().find((app) => app.name === name);
      if (!existing) {
        return undefined;
      }
      return { projectId: existing.options.projectId, app: existing };
    },
    initializeNamed(name: string, projectId: string) {
      const created = initializeApp(
        { credential: applicationDefault(), projectId },
        name,
      );
      return { projectId: created.options.projectId, app: created };
    },
  };
}

export async function openContentImportAdminApp(expectedProjectId: string): Promise<unknown> {
  const registry = await createFirebaseAdminAppRegistry();
  return resolveNamedContentImportApp({ expectedProjectId, registry });
}
