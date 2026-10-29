import path from 'node:path';
import { readArg } from '../cliArgs';
import {
  formatOfficialDraftValidationSummary,
  validateOfficialSponsorDraftInMemory,
} from '../validateOfficialDraft';

/**
 * In-memory check of the official sponsor draft.
 * Requires caller-supplied season dates. Does not write a package or import it.
 */
async function main(): Promise<void> {
  const directory = readArg('--input', path.join(process.cwd(), 'content/authoring/local'));
  const startDate = readArg('--start');
  const endDate = readArg('--end');
  if (!directory || !startDate || !endDate) {
    console.error(
      'Usage: npm run content:validate-official-draft -- --input <workbook-directory> --start YYYY-MM-DD --end YYYY-MM-DD',
    );
    process.exitCode = 1;
    return;
  }

  const summary = await validateOfficialSponsorDraftInMemory({
    directory,
    seasonDates: { startDate, endDate },
  });
  console.log(formatOfficialDraftValidationSummary(summary));
  if (summary.status !== 'passed') {
    process.exitCode = 1;
  }
}

void main();
