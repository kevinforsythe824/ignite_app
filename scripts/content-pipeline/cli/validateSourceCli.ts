import { DEFAULT_SYNTHETIC_SOURCE_DIR } from '../constants';
import { readArg } from '../cliArgs';
import { printPipelineResult, validateSourcePath } from '../pipeline';

async function main(): Promise<void> {
  const input = readArg('--input', DEFAULT_SYNTHETIC_SOURCE_DIR);
  if (!input) {
    console.error('Usage: npm run content:validate-source -- --input <file-or-directory>');
    process.exitCode = 1;
    return;
  }

  const result = await validateSourcePath(input);
  printPipelineResult(result);
  if (result.status !== 'passed') {
    process.exitCode = 1;
  }
}

void main();
