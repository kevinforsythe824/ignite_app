/**
 * @jest-environment node
 */
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { IGNITE_ENV_KEY, IGNITE_FIREBASE_PROJECTS } from '../../src/services/firebase/firebaseEnvironments';
import { FIREBASE_CLIENT_ENV_KEYS } from '../../src/services/firebase/firebaseConfig';
import { executeContentImport } from '../../scripts/content-import/executeImport';
import {
  DEV_DIFF_OUTPUT_BANNER,
  OFFLINE_PLAN_OUTPUT_BANNER,
} from '../../scripts/content-import/formatReport';
import { parseContentImportArgs } from '../../scripts/content-import/parseArgs';
import {
  loadUnsetEnvFile,
  shouldSkipContentImportEnvKey,
} from '../../scripts/content-import/cli/importCli';

const IMPORT_ROOT = path.join(process.cwd(), 'scripts/content-import');
const WRITE_API = /\.(set|update|delete|create)\s*\(|\bbatch\s*\(|\.commit\s*\(|BulkWriter|recursiveDelete|WriteBatch|runTransaction/;

function listTypeScriptFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const fullPath = path.join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...listTypeScriptFiles(fullPath));
    } else if (entry.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('content import CLI', () => {
  it('prints an offline plan without Firebase classification words', async () => {
    let output = '';
    const code = await executeContentImport({
      packageDir: 'content/packages/dev-synthetic-s3',
      mode: 'offline-plan',
      env: {
        [IGNITE_ENV_KEY]: 'prod',
        [FIREBASE_CLIENT_ENV_KEYS.projectId]: IGNITE_FIREBASE_PROJECTS.prod,
      },
      stdout: (line) => {
        output = line;
      },
      stderr: jest.fn(),
    });

    expect(code).toBe(0);
    expect(output.startsWith(OFFLINE_PLAN_OUTPUT_BANNER)).toBe(true);
    expect(output).toContain('Fingerprint:');
    expect(output).toContain('seasons: 1');
    expect(output).not.toMatch(/\b(create|update|delete|unchanged)s?\b/i);
  });

  it('prints a DEV read-only diff from an injected reader', async () => {
    const openReader = jest.fn(() => ({
      loadSeasonCurriculum: async () => ({ seasonId: 'dev-synthetic-s3', documents: [] }),
    }));
    let output = '';
    const code = await executeContentImport({
      packageDir: 'content/packages/dev-synthetic-s3',
      mode: 'dev-diff',
      env: {
        [IGNITE_ENV_KEY]: 'dev',
        [FIREBASE_CLIENT_ENV_KEYS.projectId]: IGNITE_FIREBASE_PROJECTS.dev,
      },
      openReader,
      stdout: (line) => {
        output = line;
      },
      stderr: jest.fn(),
    });

    expect(code).toBe(0);
    expect(openReader).toHaveBeenCalledTimes(1);
    expect(output.startsWith(DEV_DIFF_OUTPUT_BANNER)).toBe(true);
    expect(output).toContain('CREATE:');
    expect(output).not.toContain(OFFLINE_PLAN_OUTPUT_BANNER);
  });

  it('rejects apply without a DEV confirmation token', () => {
    const parsed = parseContentImportArgs([
      'node',
      'importCli.ts',
      '--package',
      'content/packages/2027',
      '--apply',
    ]);
    expect(parsed.ok).toBe(false);
  });

  it('parses a valid apply request without enabling writes', async () => {
    const parsed = parseContentImportArgs([
      'node',
      'importCli.ts',
      '--package',
      'content/packages/2027',
      '--apply',
      '--confirm-dev',
      IGNITE_FIREBASE_PROJECTS.dev,
    ]);
    expect(parsed).toEqual({
      ok: true,
      packageDir: 'content/packages/2027',
      mode: 'dev-apply',
      confirmDev: IGNITE_FIREBASE_PROJECTS.dev,
    });

    const openReader = jest.fn();
    const openWriter = jest.fn();
    const stderr = jest.fn();
    const code = await executeContentImport({
      packageDir: 'content/packages/2027',
      mode: 'dev-apply',
      openReader,
      openWriter,
      stdout: jest.fn(),
      stderr,
    });
    expect(code).toBe(1);
    expect(stderr).toHaveBeenCalledWith('DEV apply is not enabled until Slice 4B');
    expect(openReader).not.toHaveBeenCalled();
    expect(openWriter).not.toHaveBeenCalled();
  });

  it('rejects unknown flags, equals form, stray args, duplicates, and bad confirmation', () => {
    const base = ['node', 'importCli.ts', '--package', 'content/packages/2027'];
    expect(parseContentImportArgs([...base, '--write']).ok).toBe(false);
    expect(parseContentImportArgs(['node', 'importCli.ts', '--package=content/packages/2027']).ok).toBe(false);
    expect(parseContentImportArgs([...base, 'extra']).ok).toBe(false);
    expect(parseContentImportArgs([...base, '--package', 'other']).ok).toBe(false);
    expect(parseContentImportArgs(['node', 'importCli.ts', '--package']).ok).toBe(false);
    expect(parseContentImportArgs([...base, '--confirm-dev']).ok).toBe(false);
    expect(parseContentImportArgs([...base, '--confirm-dev', IGNITE_FIREBASE_PROJECTS.dev]).ok).toBe(false);
    expect(parseContentImportArgs([...base, '--apply', '--confirm-dev', 'not-dev']).ok).toBe(false);
    expect(parseContentImportArgs([...base, '--apply', '--dev-diff', '--confirm-dev', IGNITE_FIREBASE_PROJECTS.dev]).ok).toBe(false);
    expect(parseContentImportArgs([...base, '--dev-diff']).ok).toBe(true);
    expect(parseContentImportArgs(base)).toEqual({
      ok: true,
      packageDir: 'content/packages/2027',
      mode: 'offline-plan',
    });
  });
});

describe('content import env loading', () => {
  it('skips credential-like keys and still loads unset public keys', () => {
    expect(shouldSkipContentImportEnvKey('GOOGLE_APPLICATION_CREDENTIALS')).toBe(true);
    expect(shouldSkipContentImportEnvKey('MY_PRIVATE_KEY')).toBe(true);
    expect(shouldSkipContentImportEnvKey('SOME_SECRET')).toBe(true);
    expect(shouldSkipContentImportEnvKey('SERVICE_ACCOUNT_JSON')).toBe(true);
    expect(shouldSkipContentImportEnvKey('OTHER_CREDENTIAL')).toBe(true);
    expect(shouldSkipContentImportEnvKey('EXPO_PUBLIC_FIREBASE_PROJECT_ID')).toBe(false);

    const directory = mkdtempSync(path.join(tmpdir(), 'ignite-env-'));
    const filePath = path.join(directory, 'env');
    writeFileSync(
      filePath,
      [
        'EXPO_PUBLIC_EXAMPLE=loaded',
        'EXPO_PUBLIC_ALREADY=from-file',
        'GOOGLE_APPLICATION_CREDENTIALS=skip-me',
        'MY_PRIVATE_KEY=skip-me',
        'SOME_SECRET=skip-me',
        'SERVICE_ACCOUNT_JSON=skip-me',
      ].join('\n'),
    );
    const env: Record<string, string | undefined> = { EXPO_PUBLIC_ALREADY: 'preset' };
    loadUnsetEnvFile(filePath, env);
    expect(env.EXPO_PUBLIC_EXAMPLE).toBe('loaded');
    expect(env.EXPO_PUBLIC_ALREADY).toBe('preset');
    expect(env.GOOGLE_APPLICATION_CREDENTIALS).toBeUndefined();
    expect(env.MY_PRIVATE_KEY).toBeUndefined();
    expect(env.SOME_SECRET).toBeUndefined();
    expect(env.SERVICE_ACCOUNT_JSON).toBeUndefined();
  });
});

describe('content import write boundary', () => {
  it('has no Firestore write API in the importer sources', () => {
    const offenders: string[] = [];
    for (const filePath of listTypeScriptFiles(IMPORT_ROOT)) {
      const source = readFileSync(filePath, 'utf8');
      if (WRITE_API.test(source)) {
        offenders.push(path.relative(process.cwd(), filePath));
      }
    }
    expect(offenders).toEqual([]);
  });
});
