import path from 'node:path';
import { issue } from './errors';
import type { ValidationIssue } from './types';

/**
 * One package-directory segment. Letters, digits, hyphen, underscore, and dot.
 * `.` and `..` match this pattern and are rejected separately — never rewritten.
 */
export const SAFE_SEASON_ID_SEGMENT = /^[A-Za-z0-9._-]+$/;

const DOT_ONLY_SEGMENTS = new Set(['.', '..']);

export function seasonIdPathRejectionReason(seasonId: string): string | undefined {
  if (seasonId.length === 0) {
    return 'seasonId must be one safe filesystem segment and cannot be empty.';
  }
  if (DOT_ONLY_SEGMENTS.has(seasonId)) {
    return `seasonId "${seasonId}" is not a safe package directory name.`;
  }
  if (path.isAbsolute(seasonId)) {
    return `seasonId "${seasonId}" must not be an absolute path.`;
  }
  if (seasonId.includes('/') || seasonId.includes('\\')) {
    return `seasonId "${seasonId}" must be one filesystem segment and cannot contain a path separator.`;
  }
  if (!SAFE_SEASON_ID_SEGMENT.test(seasonId)) {
    return `seasonId "${seasonId}" must contain only letters, digits, "-", "_", and ".".`;
  }
  return undefined;
}

export function seasonIdSegmentIssue(
  seasonId: string,
  location: { workbook?: string; sheet?: string; row?: number } = {},
): ValidationIssue | undefined {
  const reason = seasonIdPathRejectionReason(seasonId);
  if (!reason) {
    return undefined;
  }
  return issue({
    code: 'unsafe_season_id',
    workbook: location.workbook,
    sheet: location.sheet,
    row: location.row,
    field: 'seasonId',
    reason,
  });
}

/**
 * Lexical containment after resolve. The season directory must stay strictly
 * inside the package output root. A name such as `..hidden` is not traversal.
 */
export function resolvedPathEscapesRoot(outputRoot: string, candidate: string): boolean {
  const root = path.resolve(outputRoot);
  const resolved = path.resolve(candidate);
  const relative = path.relative(root, resolved);
  if (relative.length === 0 || path.isAbsolute(relative)) {
    return true;
  }
  return relative.split(/[/\\]/).includes('..');
}

export function resolvePackageOutputDir(
  outputRoot: string,
  seasonId: string,
): { outputDir: string } | { error: ValidationIssue } {
  const segmentIssue = seasonIdSegmentIssue(seasonId);
  if (segmentIssue) {
    return { error: segmentIssue };
  }

  const root = path.resolve(outputRoot);
  const outputDir = path.resolve(root, seasonId);
  if (resolvedPathEscapesRoot(root, outputDir)) {
    return {
      error: issue({
        code: 'unsafe_season_id',
        field: 'seasonId',
        reason: `seasonId "${seasonId}" would write outside the package output root.`,
      }),
    };
  }
  return { outputDir };
}
