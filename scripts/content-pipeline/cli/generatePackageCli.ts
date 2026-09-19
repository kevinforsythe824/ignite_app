import { DEFAULT_PACKAGE_ROOT, DEFAULT_SYNTHETIC_SOURCE_DIR } from '../constants';
import { readArg } from '../cliArgs';
import { generatePackageFromPath, printPipelineResult } from '../pipeline';

async function main(): Promise<void> {
  const input = readArg('--input', DEFAULT_SYNTHETIC_SOURCE_DIR);
  const output = readArg('--output', DEFAULT_PACKAGE_ROOT);
  if (!input || !output) {
    console.error(
      'Usage: npm run content:generate-package -- --input <directory> --output <package-root>',
    );
    process.exitCode = 1;
    return;
  }

  const result = await generatePackageFromPath(input, output);
  printPipelineResult(result);
  if (result.outputDir) {
    console.log(`Wrote generated package to ${result.outputDir}`);
  }
  if (result.status !== 'passed') {
    process.exitCode = 1;
  }
}

void main();
