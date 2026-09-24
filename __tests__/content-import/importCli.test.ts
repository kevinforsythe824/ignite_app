/**
 * @jest-environment node
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { IGNITE_ENV_KEY, IGNITE_FIREBASE_PROJECTS } from '../../src/services/firebase/firebaseEnvironments';
import { FIREBASE_CLIENT_ENV_KEYS } from '../../src/services/firebase/firebaseConfig';
import { executeContentImport } from '../../scripts/content-import/executeImport';
import {
  DEV_DIFF_OUTPUT_BANNER,
  OFFLINE_PLAN_OUTPUT_BANNER,
} from '../../scripts/content-import/formatReport';
import { parseContentImportArgs } from '../../scripts/content-import/parseArgs';

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

  it('rejects apply flags', () => {
    const parsed = parseContentImportArgs([
      'node',
      'importCli.ts',
      '--package',
      'content/packages/2027',
      '--apply',
    ]);
    expect(parsed.ok).toBe(false);
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
