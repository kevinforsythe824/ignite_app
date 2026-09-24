import { diffCurriculum } from './diffPlan';
import {
  assertDevImportEnvironment,
  type DevImportEnvironment,
} from './environmentGate';
import { formatDevDiff, formatOfflinePlan } from './formatReport';
import {
  loadValidatedContentPackage,
  type LoadedContentPackage,
} from './loadPackage';
import { planImportDocuments } from './planDocuments';
import type { CurriculumReadPort, ImportPlan } from './types';

export type ContentImportMode = 'offline-plan' | 'dev-diff';

export interface ExecuteContentImportOptions {
  packageDir: string;
  mode: ContentImportMode;
  env?: Record<string, string | undefined>;
  stdout: (line: string) => void;
  stderr: (line: string) => void;
  planDocuments?: (loaded: LoadedContentPackage) => ImportPlan;
  openReader?: (target: DevImportEnvironment) => CurriculumReadPort;
}

export async function executeContentImport(
  options: ExecuteContentImportOptions,
): Promise<number> {
  let loaded: LoadedContentPackage;
  try {
    loaded = await loadValidatedContentPackage(options.packageDir);
  } catch (error) {
    options.stderr(error instanceof Error ? error.message : 'Package validation failed.');
    return 1;
  }

  const plan = (options.planDocuments ?? planImportDocuments)(loaded);
  if (options.mode === 'offline-plan') {
    options.stdout(formatOfflinePlan(plan));
    return 0;
  }

  let target: DevImportEnvironment;
  try {
    target = assertDevImportEnvironment(options.env ?? process.env);
  } catch (error) {
    options.stderr(error instanceof Error ? error.message : 'Environment check failed.');
    return 1;
  }

  const openReader =
    options.openReader ??
    (await import('./firestoreCurriculumReader')).openFirestoreCurriculumReader;
  const reader = openReader(target);
  const snapshot = await reader.loadSeasonCurriculum(plan.seasonId);
  options.stdout(formatDevDiff(diffCurriculum(plan, snapshot)));
  return 0;
}
