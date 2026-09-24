/**
 * @jest-environment node
 */
import { CONTENT_IMPORT_ADMIN_APP_NAME } from '../../scripts/content-import/constants';
import {
  ContentImportAdminAppError,
  resolveNamedContentImportApp,
  type NamedAdminAppRegistry,
} from '../../scripts/content-import/adminApp';

interface FakeApp {
  name: string;
  projectId: string;
}

function registry(initial?: FakeApp): NamedAdminAppRegistry<FakeApp> & { initializeNamed: jest.Mock } {
  const apps = new Map<string, FakeApp>();
  if (initial) {
    apps.set(initial.name, initial);
  }
  const initializeNamed = jest.fn((name: string, projectId: string) => {
    const created = { name, projectId };
    apps.set(name, created);
    return { projectId, app: created };
  });
  return {
    findNamed(name: string) {
      const app = apps.get(name);
      return app ? { projectId: app.projectId, app } : undefined;
    },
    initializeNamed,
  };
}

describe('resolveNamedContentImportApp', () => {
  it('initializes only the named content-import app for the expected project', () => {
    const apps = registry();
    const app = resolveNamedContentImportApp({
      expectedProjectId: 'wpf-bible-qizzing',
      registry: apps,
    });
    expect(app).toEqual({ name: CONTENT_IMPORT_ADMIN_APP_NAME, projectId: 'wpf-bible-qizzing' });
    expect(apps.initializeNamed).toHaveBeenCalledWith(CONTENT_IMPORT_ADMIN_APP_NAME, 'wpf-bible-qizzing');
  });

  it('reuses the named app when its project id matches', () => {
    const apps = registry({ name: CONTENT_IMPORT_ADMIN_APP_NAME, projectId: 'expected' });
    const app = resolveNamedContentImportApp({
      expectedProjectId: 'expected',
      registry: apps,
    });
    expect(app.projectId).toBe('expected');
    expect(apps.initializeNamed).not.toHaveBeenCalled();
  });

  it('throws on a project mismatch before a caller can use the app', () => {
    const apps = registry({ name: CONTENT_IMPORT_ADMIN_APP_NAME, projectId: 'other-project' });
    expect(() =>
      resolveNamedContentImportApp({
        expectedProjectId: 'expected',
        registry: apps,
      }),
    ).toThrow(ContentImportAdminAppError);
    expect(apps.initializeNamed).not.toHaveBeenCalled();
  });
});
