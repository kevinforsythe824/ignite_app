import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  CONTENT_SCHEMA_VERSION,
  CONVERTER_VERSION,
  DEFAULT_PACKAGE_ROOT,
  DEFAULT_SYNTHETIC_SOURCE_DIR,
} from './constants';
import { convertWorkbooksToPackage } from './convert';
import { formatValidationIssues } from './errors';
import { fingerprintContent, stablePrettyJson } from './fingerprint';
import { reconcileSourceToPackage } from './reconcile';
import type {
  AuthoringWorkbookData,
  ContentPackage,
  PackageManifest,
  ValidationIssue,
  ValidationReport,
} from './types';
import { validateContentPackage } from './validatePackage';
import { validateSourceCollection, validateSourceWorkbook } from './validateSource';
import { parseWorkbookBuffer, parseWorkbookFile } from './workbookIo';

export interface PipelineResult {
  status: 'passed' | 'failed';
  workbooks: AuthoringWorkbookData[];
  content?: ContentPackage;
  manifest?: PackageManifest;
  report: ValidationReport;
}

function collectErrors(groups: readonly ValidationIssue[][]): ValidationIssue[] {
  return groups.flat().filter((item) => item.severity === 'error');
}

export function runPipelineFromWorkbooks(
  workbooks: readonly AuthoringWorkbookData[],
  options: { generatedAt?: string } = {},
): PipelineResult {
  const sourceErrors = [
    ...workbooks.flatMap((workbook) => validateSourceWorkbook(workbook)),
    ...validateSourceCollection(workbooks),
  ];

  if (sourceErrors.length > 0) {
    return {
      status: 'failed',
      workbooks: [...workbooks],
      report: {
        status: 'failed',
        schemaVersion: CONTENT_SCHEMA_VERSION,
        seasonId: workbooks[0]?.package.seasonId,
        errors: sourceErrors,
        warnings: [],
      },
    };
  }

  const converted = convertWorkbooksToPackage(workbooks);
  if (!converted.content || converted.errors.length > 0) {
    return {
      status: 'failed',
      workbooks: [...workbooks],
      report: {
        status: 'failed',
        schemaVersion: CONTENT_SCHEMA_VERSION,
        seasonId: workbooks[0]?.package.seasonId,
        errors: converted.errors,
        warnings: [],
      },
    };
  }

  const packageErrors = validateContentPackage(converted.content);
  const reconciliation = reconcileSourceToPackage(workbooks, converted.content);
  const errors = collectErrors([packageErrors, reconciliation.errors]);
  const status = errors.length === 0 ? 'passed' : 'failed';
  const fingerprint = fingerprintContent(converted.content);
  const generatedAt = options.generatedAt ?? new Date().toISOString();

  const cardCountsBySet: Record<string, number> = {};
  for (const materialSet of converted.content.materialSets) {
    cardCountsBySet[materialSet.materialSetId] = materialSet.cards.length;
  }

  const manifest: PackageManifest = {
    schemaVersion: converted.content.schemaVersion,
    seasonId: converted.content.season.seasonId,
    sourceVersion: converted.content.sourceVersion,
    converterVersion: CONVERTER_VERSION,
    materialSets: converted.content.materialSets.map((materialSet) => ({
      materialSetId: materialSet.materialSetId,
      divisionId: materialSet.divisionId,
      displayName: materialSet.displayName,
      sectionCount: materialSet.sections.length,
      cardCount: materialSet.cards.length,
      annotationCount: materialSet.cards.reduce(
        (sum, card) => sum + card.annotations.length,
        0,
      ),
    })),
    cardCounts: {
      total: converted.content.materialSets.reduce(
        (sum, materialSet) => sum + materialSet.cards.length,
        0,
      ),
      byMaterialSet: cardCountsBySet,
    },
    fingerprint,
    validationStatus: status,
    generatedAt,
  };

  return {
    status,
    workbooks: [...workbooks],
    content: converted.content,
    manifest,
    report: {
      status,
      schemaVersion: CONTENT_SCHEMA_VERSION,
      seasonId: converted.content.season.seasonId,
      errors,
      warnings: [],
      reconciliation: reconciliation.report,
    },
  };
}

export async function loadWorkbooksFromPath(inputPath: string): Promise<{
  workbooks: AuthoringWorkbookData[];
  errors: ValidationIssue[];
}> {
  const errors: ValidationIssue[] = [];
  const workbooks: AuthoringWorkbookData[] = [];
  const files = await listWorkbookFiles(inputPath);

  if (files.length === 0) {
    return {
      workbooks,
      errors: [
        {
          severity: 'error',
          code: 'empty_source',
          reason: `No .xlsx workbooks found at ${inputPath}.`,
        },
      ],
    };
  }

  for (const filePath of files) {
    const workbookName = path.basename(filePath);
    const parsed = await parseWorkbookFile(filePath, workbookName);
    errors.push(...parsed.errors);
    if (parsed.data) {
      workbooks.push(parsed.data);
    }
  }

  workbooks.sort((left, right) =>
    left.materialSet.materialSetId.localeCompare(right.materialSet.materialSetId),
  );
  return { workbooks, errors };
}

export async function loadWorkbooksFromBuffers(
  files: readonly { name: string; buffer: Buffer }[],
): Promise<{ workbooks: AuthoringWorkbookData[]; errors: ValidationIssue[] }> {
  const errors: ValidationIssue[] = [];
  const workbooks: AuthoringWorkbookData[] = [];
  for (const file of files) {
    const parsed = await parseWorkbookBuffer(file.buffer, file.name);
    errors.push(...parsed.errors);
    if (parsed.data) {
      workbooks.push(parsed.data);
    }
  }
  workbooks.sort((left, right) =>
    left.materialSet.materialSetId.localeCompare(right.materialSet.materialSetId),
  );
  return { workbooks, errors };
}

async function listWorkbookFiles(inputPath: string): Promise<string[]> {
  const info = await stat(inputPath);
  if (info.isFile()) {
    return inputPath.endsWith('.xlsx') && !path.basename(inputPath).startsWith('~')
      ? [inputPath]
      : [];
  }

  const entries = await readdir(inputPath);
  return entries
    .filter((name) => name.endsWith('.xlsx') && !name.startsWith('~') && !name.startsWith('.'))
    .map((name) => path.join(inputPath, name))
    .sort((left, right) => left.localeCompare(right));
}

export async function validateSourcePath(inputPath: string): Promise<PipelineResult> {
  const loaded = await loadWorkbooksFromPath(inputPath);
  if (loaded.errors.length > 0 && loaded.workbooks.length === 0) {
    return {
      status: 'failed',
      workbooks: [],
      report: {
        status: 'failed',
        schemaVersion: CONTENT_SCHEMA_VERSION,
        errors: loaded.errors,
        warnings: [],
      },
    };
  }

  const result = runPipelineFromWorkbooks(loaded.workbooks);
  if (loaded.errors.length > 0) {
    return {
      ...result,
      status: 'failed',
      report: {
        ...result.report,
        status: 'failed',
        errors: [...loaded.errors, ...result.report.errors],
      },
    };
  }
  return result;
}

export async function generatePackageFromPath(
  inputPath: string,
  outputRoot: string = DEFAULT_PACKAGE_ROOT,
): Promise<PipelineResult & { outputDir?: string }> {
  const result = await validateSourcePath(inputPath);
  if (result.status !== 'passed' || !result.content || !result.manifest) {
    return result;
  }

  const outputDir = path.join(outputRoot, result.content.season.seasonId);
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'content.json'), stablePrettyJson(result.content), 'utf8');
  await writeFile(path.join(outputDir, 'manifest.json'), stablePrettyJson(result.manifest), 'utf8');
  await writeFile(
    path.join(outputDir, 'validation-report.json'),
    stablePrettyJson(result.report),
    'utf8',
  );

  return { ...result, outputDir };
}

export async function validatePackageDirectory(packageDir: string): Promise<PipelineResult> {
  const contentRaw = await readFile(path.join(packageDir, 'content.json'), 'utf8');
  const content = JSON.parse(contentRaw) as ContentPackage;
  const errors = validateContentPackage(content);
  const status = errors.length === 0 ? 'passed' : 'failed';

  let manifest: PackageManifest | undefined;
  try {
    manifest = JSON.parse(
      await readFile(path.join(packageDir, 'manifest.json'), 'utf8'),
    ) as PackageManifest;
    const expected = fingerprintContent(content);
    if (manifest.fingerprint !== expected) {
      errors.push({
        severity: 'error',
        code: 'fingerprint_mismatch',
        field: 'fingerprint',
        reason: 'manifest.json fingerprint does not match content.json.',
      });
    }
  } catch {
    errors.push({
      severity: 'error',
      code: 'missing_manifest',
      reason: 'manifest.json is missing or unreadable.',
    });
  }

  return {
    status: errors.length === 0 ? 'passed' : 'failed',
    workbooks: [],
    content,
    manifest,
    report: {
      status: errors.length === 0 ? status : 'failed',
      schemaVersion: CONTENT_SCHEMA_VERSION,
      seasonId: content.season?.seasonId,
      errors,
      warnings: [],
    },
  };
}

export function printPipelineResult(result: PipelineResult): void {
  if (result.status === 'passed') {
    const seasonId = result.content?.season.seasonId ?? result.report.seasonId ?? 'unknown';
    const total = result.manifest?.cardCounts.total ?? 0;
    console.log(`Content pipeline passed for ${seasonId} (${total} cards).`);
    if (result.report.reconciliation) {
      console.log(
        `Reconciliation: source ${result.report.reconciliation.counts.sourceCardCount} → generated ${result.report.reconciliation.counts.generatedCardCount}.`,
      );
    }
    if (result.manifest) {
      console.log(`Fingerprint: ${result.manifest.fingerprint}`);
    }
    return;
  }

  console.error('Content pipeline failed.');
  console.error(formatValidationIssues(result.report.errors));
}

export function defaultSyntheticSourceDir(): string {
  return DEFAULT_SYNTHETIC_SOURCE_DIR;
}
