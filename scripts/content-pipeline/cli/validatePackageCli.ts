import path from 'node:path';
import { DEFAULT_PACKAGE_ROOT, SYNTHETIC_SEASON_ID } from '../constants';
import { readArg } from '../cliArgs';
import { printPipelineResult, validatePackageDirectory } from '../pipeline';

async function main(): Promise<void> {
  const packageDir = readArg(
    '--package',
    path.join(DEFAULT_PACKAGE_ROOT, SYNTHETIC_SEASON_ID),
  );
  if (!packageDir) {
    console.error('Usage: npm run content:validate-package -- --package <package-directory>');
    process.exitCode = 1;
    return;
  }

  const result = await validatePackageDirectory(packageDir);
  printPipelineResult(result);
  if (result.status !== 'passed') {
    process.exitCode = 1;
  }
}

void main();
