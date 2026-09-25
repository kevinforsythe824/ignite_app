/**
 * @jest-environment node
 */
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { FIREBASE_CLIENT_ENV_KEYS } from '../../src/services/firebase/firebaseConfig';
import {
  IGNITE_ENV_KEY,
  IGNITE_FIREBASE_PROJECTS,
} from '../../src/services/firebase/firebaseEnvironments';
import { CONTENT_IMPORT_ADMIN_APP_NAME } from '../../scripts/content-import/constants';
import { executeContentImport } from '../../scripts/content-import/executeImport';
import type { CurriculumWritePort } from '../../scripts/content-import/types';
import { fingerprintContent } from '../../scripts/content-pipeline/fingerprint';
import type { ContentPackage } from '../../scripts/content-pipeline/types';

const SYNTHETIC_PACKAGE = 'content/packages/dev-synthetic-s3';

function devEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    [IGNITE_ENV_KEY]: 'dev',
    [FIREBASE_CLIENT_ENV_KEYS.projectId]: IGNITE_FIREBASE_PROJECTS.dev,
    ...overrides,
  };
}

function namedApp(projectId: string = IGNITE_FIREBASE_PROJECTS.dev, name = CONTENT_IMPORT_ADMIN_APP_NAME) {
  return async () => ({
    name,
    projectId,
    app: { name, options: { projectId } },
  });
}

function recordingWriter(): CurriculumWritePort & { calls: number } {
  const port = {
    calls: 0,
    async upsert() {
      port.calls += 1;
    },
    async remove() {
      port.calls += 1;
    },
  };
  return port;
}

function nonDraftPackageDir(): string {
  const directory = mkdtempSync(path.join(tmpdir(), 'ignite-nondraft-'));
  cpSync(SYNTHETIC_PACKAGE, directory, { recursive: true });
  const content = JSON.parse(readFileSync(path.join(directory, 'content.json'), 'utf8')) as ContentPackage;
  content.season.status = 'published';
  const fingerprint = fingerprintContent(content);
  writeFileSync(path.join(directory, 'content.json'), JSON.stringify(content));
  const manifest = JSON.parse(readFileSync(path.join(directory, 'manifest.json'), 'utf8')) as {
    fingerprint: string;
  };
  manifest.fingerprint = fingerprint;
  writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest));
  return directory;
}

describe('DEV apply production path', () => {
  it('does not open the writer for a non-draft incoming package', async () => {
    const openWriter = jest.fn();
    const openReader = jest.fn();
    const resolveApp = jest.fn();
    const code = await executeContentImport({
      packageDir: nonDraftPackageDir(),
      mode: 'dev-apply',
      env: devEnv(),
      openWriter,
      openReader,
      resolveApp,
      stdout: jest.fn(),
      stderr: jest.fn(),
    });
    expect(code).toBe(1);
    expect(openWriter).not.toHaveBeenCalled();
    expect(openReader).not.toHaveBeenCalled();
    expect(resolveApp).not.toHaveBeenCalled();
  });

  it('does not open the writer when the installed season is not draft', async () => {
    const openWriter = jest.fn();
    const openReader = jest.fn(() => ({
      loadSeasonCurriculum: async () => ({
        seasonId: 'dev-synthetic-s3',
        documents: [{ path: 'seasons/dev-synthetic-s3', data: { status: 'active', seasonId: 'dev-synthetic-s3' } }],
      }),
    }));
    const code = await executeContentImport({
      packageDir: SYNTHETIC_PACKAGE,
      mode: 'dev-apply',
      env: devEnv(),
      resolveApp: namedApp(),
      openReader,
      openWriter,
      stdout: jest.fn(),
      stderr: jest.fn(),
    });
    expect(code).toBe(1);
    expect(openReader).toHaveBeenCalledTimes(1);
    expect(openWriter).not.toHaveBeenCalled();
  });

  it('applies a draft package when the season is missing', async () => {
    const writer = recordingWriter();
    const openWriter = jest.fn(() => writer);
    let output = '';
    const errors: string[] = [];
    const code = await executeContentImport({
      packageDir: SYNTHETIC_PACKAGE,
      mode: 'dev-apply',
      env: devEnv(),
      resolveApp: namedApp(),
      openReader: () => ({
        loadSeasonCurriculum: async () => ({ seasonId: 'dev-synthetic-s3', documents: [] }),
      }),
      openWriter,
      stdout: (line) => {
        output += `${line}\n`;
      },
      stderr: (line) => {
        errors.push(line);
      },
    });
    expect(errors).toEqual([]);
    expect(code).toBe(0);
    expect(openWriter).toHaveBeenCalledTimes(1);
    expect(writer.calls).toBeGreaterThan(0);
    expect(output).toContain(`DEV APPLY — CONFIRMED PROJECT ${IGNITE_FIREBASE_PROJECTS.dev}`);
    expect(output).toContain('Import complete.');
  });

  it('applies a draft package over an existing draft season', async () => {
    const writer = recordingWriter();
    const openWriter = jest.fn(() => writer);
    const errors: string[] = [];
    const code = await executeContentImport({
      packageDir: SYNTHETIC_PACKAGE,
      mode: 'dev-apply',
      env: devEnv(),
      resolveApp: namedApp(),
      openReader: () => ({
        loadSeasonCurriculum: async () => ({
          seasonId: 'dev-synthetic-s3',
          documents: [{ path: 'seasons/dev-synthetic-s3', data: { status: 'draft', seasonId: 'dev-synthetic-s3' } }],
        }),
      }),
      openWriter,
      stdout: jest.fn(),
      stderr: (line) => {
        errors.push(line);
      },
    });
    expect(errors).toEqual([]);
    expect(code).toBe(0);
    expect(openWriter).toHaveBeenCalledTimes(1);
    expect(writer.calls).toBeGreaterThan(0);
  });

  it.each(['staging', 'prod', 'missing-env', 'missing-project', 'wrong-project'] as const)(
    'does not open the writer for %s',
    async (gate) => {
      const env =
        gate === 'missing-env'
          ? {}
          : gate === 'missing-project'
            ? { [IGNITE_ENV_KEY]: 'dev' }
            : gate === 'wrong-project'
              ? devEnv({ [FIREBASE_CLIENT_ENV_KEYS.projectId]: 'not-the-dev-project' })
              : {
                  [IGNITE_ENV_KEY]: gate,
                  [FIREBASE_CLIENT_ENV_KEYS.projectId]: IGNITE_FIREBASE_PROJECTS[gate],
                };
      const openWriter = jest.fn();
      const openReader = jest.fn();
      const resolveApp = jest.fn();
      const code = await executeContentImport({
        packageDir: SYNTHETIC_PACKAGE,
        mode: 'dev-apply',
        env,
        openWriter,
        openReader,
        resolveApp,
        stdout: jest.fn(),
        stderr: jest.fn(),
      });
      expect(code).toBe(1);
      expect(openWriter).not.toHaveBeenCalled();
      expect(openReader).not.toHaveBeenCalled();
      expect(resolveApp).not.toHaveBeenCalled();
    },
  );

  it('refuses the live apply path when the Firestore emulator host is set', async () => {
    const openWriter = jest.fn();
    const openReader = jest.fn();
    const resolveApp = jest.fn();
    const stderr = jest.fn();
    const code = await executeContentImport({
      packageDir: SYNTHETIC_PACKAGE,
      mode: 'dev-apply',
      env: devEnv({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }),
      openWriter,
      openReader,
      resolveApp,
      stdout: jest.fn(),
      stderr,
    });
    expect(code).toBe(1);
    expect(stderr).toHaveBeenCalledWith(expect.stringMatching(/FIRESTORE_EMULATOR_HOST/));
    expect(openWriter).not.toHaveBeenCalled();
    expect(openReader).not.toHaveBeenCalled();
    expect(resolveApp).not.toHaveBeenCalled();
  });

  it('fails before any write when the named app project does not match DEV', async () => {
    const openWriter = jest.fn();
    const openReader = jest.fn();
    const code = await executeContentImport({
      packageDir: SYNTHETIC_PACKAGE,
      mode: 'dev-apply',
      env: devEnv(),
      resolveApp: namedApp('ignite-staging-01'),
      openReader,
      openWriter,
      stdout: jest.fn(),
      stderr: jest.fn(),
    });
    expect(code).toBe(1);
    expect(openReader).not.toHaveBeenCalled();
    expect(openWriter).not.toHaveBeenCalled();
  });
});
