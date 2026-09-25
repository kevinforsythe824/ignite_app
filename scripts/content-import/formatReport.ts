import type { CurriculumDiffReport, ImportPlan } from './types';

const OFFLINE_PLAN_BANNER = 'OFFLINE PLAN — FIREBASE NOT ACCESSED — ZERO WRITES';
const DEV_DIFF_BANNER = 'DEV READ-ONLY DRY RUN — ZERO WRITES';
const ALREADY_INSTALLED_BANNER =
  'PACKAGE ALREADY INSTALLED — NO CONTENT CHANGES DETECTED';
const FINGERPRINT_DRIFT_BANNER = 'FINGERPRINT MATCHES BUT CURRICULUM DIFFERS';

export function formatOfflinePlan(plan: ImportPlan): string {
  const lines = [
    OFFLINE_PLAN_BANNER,
    `Season: ${plan.seasonId}`,
    `Fingerprint: ${plan.fingerprint}`,
    'Intended document counts:',
    `  seasons: ${plan.counts.seasons}`,
    `  materialSets: ${plan.counts.materialSets}`,
    `  sections: ${plan.counts.sections}`,
    `  cards: ${plan.counts.cards}`,
    `Embedded annotations: ${plan.counts.annotations}`,
    'Intended paths:',
    ...plan.documents.map((document) => `  ${document.path}`),
  ];
  return lines.join('\n');
}

export function formatDevDiff(report: CurriculumDiffReport): string {
  const lines = [
    DEV_DIFF_BANNER,
    `Season: ${report.seasonId}`,
    `Package fingerprint: ${report.packageFingerprint}`,
    `Installed provenance fingerprint: ${report.installedFingerprint ?? '(none)'}`,
    `CREATE: ${report.counts.CREATE}`,
    `UPDATE: ${report.counts.UPDATE}`,
    `UNCHANGED: ${report.counts.UNCHANGED}`,
    `DELETE: ${report.counts.DELETE}`,
  ];

  if (report.outcome === 'already-installed') {
    lines.push(ALREADY_INSTALLED_BANNER);
  } else if (report.outcome === 'fingerprint-drift') {
    lines.push(FINGERPRINT_DRIFT_BANNER);
  }

  const changed = report.entries.filter((entry) => entry.classification !== 'UNCHANGED');
  if (changed.length > 0) {
    lines.push('Changed paths:');
    for (const entry of changed) {
      lines.push(`  ${entry.classification} ${entry.path}`);
    }
  }

  return lines.join('\n');
}

export function formatDevApplyPreview(input: {
  projectId: string;
  seasonId: string;
  fingerprint: string;
  counts: CurriculumDiffReport['counts'];
}): string {
  return [
    `DEV APPLY — CONFIRMED PROJECT ${input.projectId}`,
    `Season: ${input.seasonId}`,
    `Package fingerprint: ${input.fingerprint}`,
    `CREATE: ${input.counts.CREATE}`,
    `UPDATE: ${input.counts.UPDATE}`,
    `UNCHANGED: ${input.counts.UNCHANGED}`,
    `DELETE: ${input.counts.DELETE}`,
  ].join('\n');
}

export function formatDevApplyComplete(input: {
  fingerprint: string;
  documentsAffected: number;
}): string {
  return [
    'Import complete.',
    `Installed fingerprint: ${input.fingerprint}`,
    `Documents affected: ${input.documentsAffected}`,
    'Run the read-only DEV diff again to confirm the installed tree.',
  ].join('\n');
}

export function formatDevApplyAlreadyInstalled(): string {
  return 'Already installed. Zero curriculum writes. Zero provenance writes.';
}

export function formatDevApplyIncomplete(): string {
  return 'Import incomplete. The season may remain importing. Rerun the same package.';
}

export const OFFLINE_PLAN_OUTPUT_BANNER = OFFLINE_PLAN_BANNER;
export const DEV_DIFF_OUTPUT_BANNER = DEV_DIFF_BANNER;
export const ALREADY_INSTALLED_OUTPUT = ALREADY_INSTALLED_BANNER;
export const FINGERPRINT_DRIFT_OUTPUT = FINGERPRINT_DRIFT_BANNER;
