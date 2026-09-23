/**
 * @jest-environment node
 */
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generatePackageFromPath, runPipelineFromWorkbooks } from '../../scripts/content-pipeline/pipeline';
import {
  resolvePackageOutputDir,
  resolvedPathEscapesRoot,
  seasonIdPathRejectionReason,
} from '../../scripts/content-pipeline/seasonIdPath';
import { buildAllSyntheticWorkbooks } from '../../scripts/content-pipeline/syntheticData';
import { cloneWorkbook, workbookBufferFromData } from '../../scripts/content-pipeline/testSupport';
import type { AuthoringWorkbookData } from '../../scripts/content-pipeline/types';

const SAFE_SEASON_IDS = ['2027', 'dev-synthetic-s3', 'season_2027.1', '..hidden'] as const;

const UNSAFE_SEASON_IDS = [
  '',
  '.',
  '..',
  '../2027',
  '2027/test',
  '2027\\..\\secret',
  '/tmp/2027',
  'C:\\2027',
] as const;

function withSeasonId(seasonId: string): AuthoringWorkbookData[] {
  return buildAllSyntheticWorkbooks().map((workbook) => {
    const copy = cloneWorkbook(workbook);
    copy.package = { ...copy.package, seasonId };
    copy.materialSet = { ...copy.materialSet, seasonId };
    return copy;
  });
}

async function writeWorkbooks(dir: string, workbooks: readonly AuthoringWorkbookData[]): Promise<void> {
  await mkdir(dir, { recursive: true });
  for (const workbook of workbooks) {
    const buffer = await workbookBufferFromData(workbook, { synthetic: true });
    await writeFile(path.join(dir, workbook.workbookName), buffer);
  }
}

describe('seasonId filesystem safety', () => {
  it.each(SAFE_SEASON_IDS)('accepts safe seasonId %s', (seasonId) => {
    expect(seasonIdPathRejectionReason(seasonId)).toBeUndefined();
    const root = path.join(os.tmpdir(), 'ignite-season-root');
    const located = resolvePackageOutputDir(root, seasonId);
    expect('outputDir' in located).toBe(true);
    if (!('outputDir' in located)) {
      return;
    }
    expect(located.outputDir).toBe(path.resolve(root, seasonId));
    expect(resolvedPathEscapesRoot(root, located.outputDir)).toBe(false);
  });

  it.each(UNSAFE_SEASON_IDS)('rejects unsafe seasonId %s', (seasonId) => {
    expect(seasonIdPathRejectionReason(seasonId)).toEqual(expect.any(String));
    const located = resolvePackageOutputDir(path.join(os.tmpdir(), 'ignite-season-root'), seasonId);
    expect('error' in located && located.error.code).toBe('unsafe_season_id');
  });

  it('rejects a dangerous seasonId during source validation before package generation', () => {
    const result = runPipelineFromWorkbooks(withSeasonId('..'));
    expect(result.status).toBe('failed');
    expect(result.content).toBeUndefined();
    expect(result.report.errors.some((item) => item.code === 'unsafe_season_id')).toBe(true);
    expect(result.report.errors.some((item) => item.sheet === 'Package')).toBe(true);
  });

  it('keeps a resolved season directory inside the output root', () => {
    const root = path.join(os.tmpdir(), 'ignite-packages');
    expect(resolvedPathEscapesRoot(root, path.resolve(root, '2027'))).toBe(false);
    expect(resolvedPathEscapesRoot(root, path.resolve(root, '..'))).toBe(true);
    expect(resolvedPathEscapesRoot(root, path.resolve(root, '..', 'outside'))).toBe(true);
    expect(resolvedPathEscapesRoot(root, root)).toBe(true);
    expect(resolvedPathEscapesRoot(root, path.resolve(root, '..hidden'))).toBe(false);
  });

  it('writes a safe seasonId only inside a temp output root', async () => {
    const parent = await mkdtemp(path.join(os.tmpdir(), 'ignite-safe-season-'));
    const inputDir = path.join(parent, 'input');
    const outputRoot = path.join(parent, 'packages');
    try {
      await writeWorkbooks(inputDir, withSeasonId('2027'));
      await mkdir(outputRoot);
      const result = await generatePackageFromPath(inputDir, outputRoot);
      expect(result.status).toBe('passed');
      expect(result.outputDir).toBe(path.resolve(outputRoot, '2027'));
      expect(existsSync(path.join(outputRoot, '2027', 'content.json'))).toBe(true);
      expect(resolvedPathEscapesRoot(outputRoot, result.outputDir ?? '')).toBe(false);
      const escaped = path.resolve(outputRoot, '..', 'content.json');
      expect(existsSync(escaped)).toBe(false);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it('does not write a dangerous seasonId outside the output root', async () => {
    const parent = await mkdtemp(path.join(os.tmpdir(), 'ignite-unsafe-season-'));
    const inputDir = path.join(parent, 'input');
    const outputRoot = path.join(parent, 'packages');
    try {
      await writeWorkbooks(inputDir, withSeasonId('../2027'));
      await mkdir(outputRoot);
      const result = await generatePackageFromPath(inputDir, outputRoot);
      expect(result.status).toBe('failed');
      expect(result.report.errors.some((item) => item.code === 'unsafe_season_id')).toBe(true);
      expect(await readdir(outputRoot)).toEqual([]);
      expect(existsSync(path.join(parent, '2027', 'content.json'))).toBe(false);
      expect(existsSync(path.join(parent, 'content.json'))).toBe(false);
      expect(existsSync(path.join(outputRoot, 'content.json'))).toBe(false);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });
});
