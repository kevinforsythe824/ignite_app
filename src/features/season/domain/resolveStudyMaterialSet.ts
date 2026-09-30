import { isDivisionId } from './division';
import type { MaterialSet } from './materialSet';
import { parseReadyParticipationRecord } from './readyParticipationRecord';
import type { QuizzerSeasonParticipation } from './quizzerSeasonParticipation';

/**
 * Resolves the MaterialSet a ready participation studies.
 * MaterialSet ids are taken from the matching record. They are not built from names.
 * Missing, malformed, or cross-season configuration is invalid — not an empty default.
 * Does not call curriculum loading.
 */

export interface StudyTarget {
  readonly seasonId: string;
  readonly materialSetId: string;
}

export type StudyMaterialSetInvalidReason =
  | 'malformedParticipation'
  | 'invalidCatalog'
  | 'missingTarget';

export type ResolveStudyMaterialSetResult =
  | { status: 'resolved'; studyTarget: StudyTarget }
  | { status: 'ambiguous' }
  | { status: 'invalid'; reason: StudyMaterialSetInvalidReason };

const MATERIAL_SET_FIELDS = ['displayName', 'divisionId', 'materialSetId', 'seasonId'] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim() === value;
}

function isStructurallyValidMaterialSet(value: unknown): value is MaterialSet {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const row = value as Record<string, unknown>;
  const keys = Object.keys(row);
  if (keys.length !== MATERIAL_SET_FIELDS.length) {
    return false;
  }
  if (!MATERIAL_SET_FIELDS.every((field) => Object.prototype.hasOwnProperty.call(row, field))) {
    return false;
  }

  return (
    isNonEmptyString(row.seasonId) &&
    isNonEmptyString(row.materialSetId) &&
    isDivisionId(row.divisionId) &&
    isNonEmptyString(row.displayName)
  );
}

function toStudyTarget(materialSet: MaterialSet): StudyTarget {
  return {
    seasonId: materialSet.seasonId,
    materialSetId: materialSet.materialSetId,
  };
}

function fromMatches(matches: readonly MaterialSet[]): ResolveStudyMaterialSetResult {
  if (matches.length === 0) {
    return { status: 'invalid', reason: 'missingTarget' };
  }
  if (matches.length === 1) {
    const match = matches[0];
    if (match) {
      return { status: 'resolved', studyTarget: toStudyTarget(match) };
    }
  }
  return { status: 'ambiguous' };
}

function matchesForParticipation(
  participation: QuizzerSeasonParticipation,
  sameSeason: readonly MaterialSet[],
): readonly MaterialSet[] {
  if (participation.participationType === 'competitive') {
    return sameSeason.filter((materialSet) => materialSet.divisionId === participation.divisionId);
  }
  return sameSeason.filter(
    (materialSet) => materialSet.materialSetId === participation.studyTrackMaterialSetId,
  );
}

export function resolveStudyMaterialSet(
  participation: unknown,
  materialSets: unknown,
): ResolveStudyMaterialSetResult {
  const parsed = parseReadyParticipationRecord(participation);
  if (!parsed.ok) {
    return { status: 'invalid', reason: 'malformedParticipation' };
  }

  if (!Array.isArray(materialSets)) {
    return { status: 'invalid', reason: 'invalidCatalog' };
  }

  const catalog: MaterialSet[] = [];
  for (const materialSet of materialSets) {
    if (!isStructurallyValidMaterialSet(materialSet)) {
      return { status: 'invalid', reason: 'invalidCatalog' };
    }
    catalog.push(materialSet);
  }

  const sameSeason = catalog.filter(
    (materialSet) => materialSet.seasonId === parsed.participation.seasonId,
  );

  return fromMatches(matchesForParticipation(parsed.participation, sameSeason));
}
