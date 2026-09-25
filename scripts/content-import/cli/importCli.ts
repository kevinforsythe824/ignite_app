import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { executeContentImport } from '../executeImport';
import { parseContentImportArgs } from '../parseArgs';

const SENSITIVE_ENV_KEY = /PRIVATE|SECRET|CREDENTIAL|SERVICE_ACCOUNT/i;

/** True when a dotenv key must never be copied into the process environment. */
export function shouldSkipContentImportEnvKey(key: string): boolean {
  return key === 'GOOGLE_APPLICATION_CREDENTIALS' || SENSITIVE_ENV_KEY.test(key);
}

export function loadUnsetEnvFile(
  filePath: string,
  env: Record<string, string | undefined> = process.env,
): void {
  if (!existsSync(filePath)) {
    return;
  }
  for (const rawLine of readFileSync(filePath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }
    const separator = line.indexOf('=');
    if (separator <= 0) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (shouldSkipContentImportEnvKey(key)) {
      continue;
    }
    if (env[key] === undefined) {
      env[key] = value;
    }
  }
}

async function main(): Promise<void> {
  const parsed = parseContentImportArgs(process.argv);
  if (!parsed.ok) {
    console.error(parsed.message);
    process.exitCode = 1;
    return;
  }

  if (parsed.mode === 'dev-diff' || parsed.mode === 'dev-apply') {
    loadUnsetEnvFile(path.join(process.cwd(), '.env.local'));
  }

  try {
    process.exitCode = await executeContentImport({
      packageDir: parsed.packageDir,
      mode: parsed.mode,
      env: process.env,
      stdout: (line) => console.log(line),
      stderr: (line) => console.error(line),
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Content import failed.');
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ?? '';
if (invokedPath.endsWith(`${path.sep}importCli.ts`) || invokedPath.endsWith(`${path.sep}importCli.js`)) {
  void main();
}
