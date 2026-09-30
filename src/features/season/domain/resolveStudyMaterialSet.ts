import { isDivisionId } from './division';
import type { MaterialSet } from './materialSet';
import type { QuizzerSeasonParticipation } from './quizzerSeasonParticipation';

/**
 * Resolves the MaterialSet a participation studies.
 * MaterialSet ids are taken from the matching record. They are not built from names.
 * Does not call curriculum loading.
 */

export interface StudyTarget {
  readonly seasonId: string;
  readonly materialSetId: string;
}

export type ResolveStudyMaterialSetResult =
  | { status: 'resolved'; studyTarget: StudyTarget }
  | { status: 'none' }
  | { status: 'ambiguous' };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim() === value;
}

function isStructurallyValidMaterialSet(value: unknown): value is MaterialSet {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const row = value as Record<string, unknown>;
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
    return { status: 'none' };
  }
  if (matches.length === 1) {
    const match = matches[0];
    if (match) {
      return { status: 'resolved', studyTarget: toStudyTarget(match) };
    }
  }
  return { status: 'ambiguous' };
}

function isCompetitiveParticipation(
  value: QuizzerSeasonParticipation,
): value is Extract<QuizzerSeasonParticipation, { participationType: 'competitive' }> {
  if (value.participationType !== 'competitive') {
    return false;
  }
  return !('studyTrackMaterialSetId' in value);
}

function isStudyTrackParticipation(
  value: QuizzerSeasonParticipation,
): value is Extract<QuizzerSeasonParticipation, { participationType: 'studyTrack' }> {
  if (value.participationType !== 'studyTrack') {
    return false;
  }
  return !('divisionId' in value) && isNonEmptyString(value.studyTrackMaterialSetId);
}

export function resolveStudyMaterialSet(
  participation: QuizzerSeasonParticipation,
  materialSets: readonly MaterialSet[],
): ResolveStudyMaterialSetResult {
  if (!isNonEmptyString(participation.seasonId) || !Array.isArray(materialSets)) {
    return { status: 'none' };
  }

  const sameSeason = materialSets.filter(
    (materialSet) =>
      isStructurallyValidMaterialSet(materialSet) &&
      materialSet.seasonId === participation.seasonId,
  );

  if (isCompetitiveParticipation(participation)) {
    if (!isDivisionId(participation.divisionId)) {
      return { status: 'none' };
    }
    return fromMatches(
      sameSeason.filter((materialSet) => materialSet.divisionId === participation.divisionId),
    );
  }

  if (isStudyTrackParticipation(participation)) {
    return fromMatches(
      sameSeason.filter(
        (materialSet) => materialSet.materialSetId === participation.studyTrackMaterialSetId,
      ),
    );
  }

  return { status: 'none' };
}
