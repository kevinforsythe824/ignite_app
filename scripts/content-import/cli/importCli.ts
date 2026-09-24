import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { executeContentImport } from '../executeImport';
import { parseContentImportArgs } from '../parseArgs';

function loadUnsetEnvFile(filePath: string): void {
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
    if (process.env[key] === undefined) {
      process.env[key] = value;
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

  if (parsed.mode === 'dev-diff') {
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

void main();
