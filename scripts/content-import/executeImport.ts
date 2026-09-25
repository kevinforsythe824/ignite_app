import { applyReplacement } from './applyReplacement';
import { CONTENT_IMPORT_ADMIN_APP_NAME, IMPORT_STATUS_COMPLETE } from './constants';
import { diffCurriculum } from './diffPlan';
import { assertDraftApplyEligible } from './draftGate';
import {
  assertDevImportEnvironment,
  ContentImportEnvironmentError,
  type DevImportEnvironment,
} from './environmentGate';
import {
  formatDevApplyAlreadyInstalled,
  formatDevApplyComplete,
  formatDevApplyIncomplete,
  formatDevApplyPreview,
  formatDevDiff,
  formatOfflinePlan,
} from './formatReport';
import {
  ContentImportPackageError,
  loadValidatedContentPackage,
  type LoadedContentPackage,
} from './loadPackage';
import { planImportDocuments } from './planDocuments';
import { IGNITE_FIREBASE_PROJECTS } from '../../src/services/firebase/firebaseEnvironments';
import { ContentImportAdminAppError } from './adminApp';
import type {
  CurriculumDiffReport,
  CurriculumReadPort,
  CurriculumWritePort,
  ImportPlan,
  SeasonCurriculumSnapshot,
} from './types';

export type ContentImportMode = 'offline-plan' | 'dev-diff' | 'dev-apply';

export interface ResolvedContentImportApp {
  name: string;
  projectId: string | undefined;
  app: unknown;
}

export interface ExecuteContentImportOptions {
  packageDir: string;
  mode: ContentImportMode;
  env?: Record<string, string | undefined>;
  stdout: (line: string) => void;
  stderr: (line: string) => void;
  planDocuments?: (loaded: LoadedContentPackage) => ImportPlan;
  openReader?: (target: DevImportEnvironment) => CurriculumReadPort;
  /** Injected for tests. Production opens the writer only after every apply gate passes. */
  openWriter?: (target: DevImportEnvironment) => CurriculumWritePort;
  /** Injected for tests. Production resolves the named Admin app before any mutation. */
  resolveApp?: (projectId: string) => Promise<ResolvedContentImportApp>;
}

const PACKAGE_FINGERPRINT = /^[a-f0-9]{64}$/;

function assertPackageFingerprint(loaded: LoadedContentPackage): void {
  const fingerprint = loaded.manifest.fingerprint;
  if (
    typeof fingerprint !== 'string' ||
    !PACKAGE_FINGERPRINT.test(fingerprint) ||
    fingerprint !== loaded.fingerprint
  ) {
    throw new ContentImportPackageError('Package fingerprint is missing or invalid.');
  }
}

function seasonDocument(snapshot: SeasonCurriculumSnapshot, seasonId: string): Record<string, unknown> | null {
  const season = snapshot.documents.find((document) => document.path === `seasons/${seasonId}`);
  return season?.data ?? null;
}

function installedSeasonStatus(snapshot: SeasonCurriculumSnapshot, seasonId: string): string | null {
  const season = seasonDocument(snapshot, seasonId);
  if (!season) {
    return null;
  }
  const status = season.status;
  return typeof status === 'string' ? status : '';
}

function installedImportStatus(snapshot: SeasonCurriculumSnapshot, seasonId: string): string | null {
  const season = seasonDocument(snapshot, seasonId);
  const provenance = season?.provenance;
  if (provenance === null || typeof provenance !== 'object' || Array.isArray(provenance)) {
    return null;
  }
  const importStatus = (provenance as Record<string, unknown>).importStatus;
  return typeof importStatus === 'string' ? importStatus : null;
}

function documentsAffected(report: CurriculumDiffReport): number {
  const paths = new Set(
    report.entries
      .filter((entry) => entry.classification !== 'UNCHANGED')
      .map((entry) => entry.path),
  );
  const season = report.entries.find((entry) => entry.kind === 'season');
  if (season) {
    paths.add(season.path);
  }
  return paths.size;
}

function refuseEmulatorOnLiveApply(env: Record<string, string | undefined>): void {
  const emulatorHost = env.FIRESTORE_EMULATOR_HOST?.trim();
  if (emulatorHost) {
    throw new ContentImportEnvironmentError(
      'DEV apply refuses to run while FIRESTORE_EMULATOR_HOST is set. The live CLI must not write to the emulator.',
    );
  }
}

function assertNamedDevApp(resolved: ResolvedContentImportApp, projectId: string): void {
  if (resolved.name !== CONTENT_IMPORT_ADMIN_APP_NAME || resolved.projectId !== projectId) {
    throw new ContentImportAdminAppError(
      `Content import Admin app "${resolved.name}" for project "${resolved.projectId ?? ''}" does not match "${CONTENT_IMPORT_ADMIN_APP_NAME}" on "${projectId}".`,
    );
  }
  if (projectId !== IGNITE_FIREBASE_PROJECTS.dev) {
    throw new ContentImportAdminAppError(
      `Content import Admin app project "${projectId}" is not the DEV project.`,
    );
  }
}

async function defaultResolveApp(projectId: string): Promise<ResolvedContentImportApp> {
  const { openContentImportAdminApp } = await import('./adminApp');
  const app = (await openContentImportAdminApp(projectId)) as {
    name?: string;
    options?: { projectId?: string };
  };
  return {
    name: app.name ?? '',
    projectId: app.options?.projectId,
    app,
  };
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

  if (options.mode === 'dev-diff') {
    return executeDevDiff(options, plan);
  }

  return executeDevApply(options, loaded, plan);
}

async function executeDevDiff(
  options: ExecuteContentImportOptions,
  plan: ImportPlan,
): Promise<number> {
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

async function executeDevApply(
  options: ExecuteContentImportOptions,
  loaded: LoadedContentPackage,
  plan: ImportPlan,
): Promise<number> {
  const env = options.env ?? process.env;
  try {
    assertPackageFingerprint(loaded);
    assertDraftApplyEligible({
      packageStatus: loaded.content.season.status,
      installedStatus: null,
    });
  } catch (error) {
    options.stderr(error instanceof Error ? error.message : 'Package is not eligible to apply.');
    return 1;
  }

  let target: DevImportEnvironment;
  try {
    target = assertDevImportEnvironment(env);
    refuseEmulatorOnLiveApply(env);
  } catch (error) {
    options.stderr(error instanceof Error ? error.message : 'Environment check failed.');
    return 1;
  }

  let resolved: ResolvedContentImportApp;
  try {
    resolved = await (options.resolveApp ?? defaultResolveApp)(target.projectId);
    assertNamedDevApp(resolved, target.projectId);
  } catch (error) {
    options.stderr(error instanceof Error ? error.message : 'Admin app check failed.');
    return 1;
  }

  const openReader =
    options.openReader ??
    (await import('./firestoreCurriculumReader')).openFirestoreCurriculumReader;
  let snapshot: SeasonCurriculumSnapshot;
  try {
    snapshot = await openReader(target).loadSeasonCurriculum(plan.seasonId);
    assertDraftApplyEligible({
      packageStatus: loaded.content.season.status,
      installedStatus: installedSeasonStatus(snapshot, plan.seasonId),
    });
  } catch (error) {
    options.stderr(error instanceof Error ? error.message : 'Installed season is not eligible to apply.');
    return 1;
  }

  const report = diffCurriculum(plan, snapshot);
  options.stdout(
    formatDevApplyPreview({
      projectId: target.projectId,
      seasonId: plan.seasonId,
      fingerprint: plan.fingerprint,
      counts: report.counts,
    }),
  );

  if (
    report.fingerprintMatches &&
    report.contentMatches &&
    installedImportStatus(snapshot, plan.seasonId) === IMPORT_STATUS_COMPLETE
  ) {
    options.stdout(formatDevApplyAlreadyInstalled());
    return 0;
  }

  try {
    const writer = options.openWriter
      ? options.openWriter(target)
      : await openLiveWriter(resolved.app);
    const outcome = await applyReplacement({
      plan,
      snapshot,
      port: writer,
      now: () => new Date().toISOString(),
      environment: 'dev',
    });
    if (outcome === 'already-installed') {
      options.stdout(formatDevApplyAlreadyInstalled());
      return 0;
    }
    options.stdout(
      formatDevApplyComplete({
        fingerprint: plan.fingerprint,
        documentsAffected: documentsAffected(report),
      }),
    );
    return 0;
  } catch (error) {
    options.stderr(formatDevApplyIncomplete());
    options.stderr(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
    return 1;
  }
}

async function openLiveWriter(app: unknown): Promise<CurriculumWritePort> {
  const { openFirestoreCurriculumWriter } = await import('./firestoreCurriculumWriter');
  return openFirestoreCurriculumWriter(app);
}
