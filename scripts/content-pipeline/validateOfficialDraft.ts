import { buildOfficialSponsorDraft } from './buildOfficialSponsorDraft';
import { formatValidationIssues } from './errors';
import { canonicalize, fingerprintContent, stablePrettyJson } from './fingerprint';
import type { OfficialDraftSeasonDates } from './officialDraftPackage';
import type { SponsorSourceProfile } from './sponsorSourceProfile';
import type { ContentPackage, PackageManifest, ValidationIssue } from './types';
import { manifestConsistencyIssues } from './validateManifest';
import { validateContentPackage } from './validatePackage';

export interface OfficialDraftMaterialSetSummary {
  readonly materialSetId: string;
  readonly divisionId: string;
  readonly sections: number;
  readonly cards: number;
  readonly annotations: number;
}

/**
 * In-memory result of the official draft check.
 * A passed result is structural only. It does not import, activate, or publish.
 */
export interface OfficialDraftValidationSummary {
  readonly status: 'passed' | 'failed';
  readonly workbookReadCount: number;
  readonly rulesVersion?: string;
  readonly schemaVersion?: string;
  readonly seasonId?: string;
  readonly seasonStatus?: string;
  readonly sourceVersion?: string;
  readonly fingerprint?: string;
  readonly materialSets: readonly OfficialDraftMaterialSetSummary[];
  readonly totalCards: number;
  readonly totalAnnotations: number;
  readonly pipelineErrors: readonly ValidationIssue[];
  readonly strictPackageErrors: readonly ValidationIssue[];
  readonly manifestErrors: readonly ValidationIssue[];
  readonly serializationMatches: boolean;
}

function annotationCount(content: ContentPackage, materialSetId: string): number {
  const materialSet = content.materialSets.find((item) => item.materialSetId === materialSetId);
  if (!materialSet) {
    return 0;
  }
  return materialSet.cards.reduce((sum, card) => sum + card.annotations.length, 0);
}

function serializationMatches(content: ContentPackage, manifest: PackageManifest): boolean {
  const readContent = JSON.parse(stablePrettyJson(content)) as ContentPackage;
  const readManifest = JSON.parse(stablePrettyJson(manifest)) as PackageManifest;
  return (
    canonicalize(readContent) === canonicalize(content) &&
    canonicalize(readManifest) === canonicalize(manifest) &&
    fingerprintContent(readContent) === manifest.fingerprint &&
    fingerprintContent(readContent) === fingerprintContent(content)
  );
}

/**
 * Reads the caller-supplied sponsor profile, builds the draft in memory, and
 * checks source generation, strict package structure, manifest fields, and a
 * JSON read-back. Nothing is written and nothing is imported.
 */
export async function validateOfficialSponsorDraftInMemory(input: {
  directory: string;
  profile?: SponsorSourceProfile;
  seasonDates?: OfficialDraftSeasonDates;
}): Promise<OfficialDraftValidationSummary> {
  const draft = await buildOfficialSponsorDraft(input);
  const content = draft.pipeline.content;
  const manifest = draft.pipeline.manifest;
  const strictPackageErrors = content ? validateContentPackage(content) : [];
  const manifestErrors = content && manifest ? manifestConsistencyIssues(content, manifest) : [];
  const roundTrip = content && manifest ? serializationMatches(content, manifest) : false;
  const materialSets: OfficialDraftMaterialSetSummary[] = content
    ? content.materialSets.map((materialSet) => ({
        materialSetId: materialSet.materialSetId,
        divisionId: materialSet.divisionId,
        sections: materialSet.sections.length,
        cards: materialSet.cards.length,
        annotations: annotationCount(content, materialSet.materialSetId),
      }))
    : [];
  const totalCards = materialSets.reduce((sum, materialSet) => sum + materialSet.cards, 0);
  const totalAnnotations = materialSets.reduce((sum, materialSet) => sum + materialSet.annotations, 0);
  const passed =
    draft.status === 'passed' &&
    strictPackageErrors.length === 0 &&
    manifestErrors.length === 0 &&
    roundTrip;

  return {
    status: passed ? 'passed' : 'failed',
    workbookReadCount: draft.workbookReadCount,
    rulesVersion: draft.rulesVersion,
    schemaVersion: content?.schemaVersion,
    seasonId: content?.season.seasonId,
    seasonStatus: content?.season.status,
    sourceVersion: content?.sourceVersion,
    fingerprint: manifest?.fingerprint,
    materialSets,
    totalCards,
    totalAnnotations,
    pipelineErrors: draft.pipeline.report.errors,
    strictPackageErrors,
    manifestErrors,
    serializationMatches: roundTrip,
  };
}

/** Developer-readable summary. It does not include Scripture text. */
export function formatOfficialDraftValidationSummary(summary: OfficialDraftValidationSummary): string {
  const lines = [
    `Official draft validation: ${summary.status}`,
    `Workbooks read: ${summary.workbookReadCount}`,
    `Rules version: ${summary.rulesVersion ?? '(unread)'}`,
    `Schema: ${summary.schemaVersion ?? '(none)'}`,
    `Season: ${summary.seasonId ?? '(none)'} ${summary.seasonStatus ?? ''}`.trim(),
    `Source version: ${summary.sourceVersion ?? '(none)'}`,
    `Fingerprint: ${summary.fingerprint ?? '(none)'}`,
    'MaterialSets:',
    ...summary.materialSets.map(
      (materialSet) =>
        `  ${materialSet.materialSetId} (${materialSet.divisionId}): ${materialSet.sections} sections, ${materialSet.cards} cards, ${materialSet.annotations} annotations`,
    ),
    `Totals: ${summary.totalCards} cards, ${summary.totalAnnotations} annotations`,
    `Strict package validation: ${summary.strictPackageErrors.length === 0 ? 'passed' : 'failed'}`,
    `Manifest: ${summary.manifestErrors.length === 0 ? 'passed' : 'failed'}`,
    `Serialization read-back: ${summary.serializationMatches ? 'passed' : 'failed'}`,
    'This check does not import, activate, or publish content.',
  ];
  const issues = [
    ...summary.pipelineErrors,
    ...summary.strictPackageErrors,
    ...summary.manifestErrors,
  ];
  if (issues.length > 0) {
    lines.push(formatValidationIssues(issues));
  }
  return lines.join('\n');
}
