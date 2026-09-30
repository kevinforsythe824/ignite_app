import { isDivisionId, type DivisionId } from './division';
import type { QuizzerSeasonParticipation } from './quizzerSeasonParticipation';

/**
 * Strict shape of a ready participation record.
 * Eligibility inputs are not fields of this record.
 * This does not check that quizzerId or seasonId match a Firestore path.
 */

const COMPETITIVE_FIELDS = [
  'divisionId',
  'participationType',
  'quizzerId',
  'readiness',
  'regionId',
  'seasonId',
] as const;

const STUDY_TRACK_FIELDS = [
  'participationType',
  'quizzerId',
  'readiness',
  'regionId',
  'seasonId',
  'studyTrackMaterialSetId',
] as const;

export type ReadyQuizzerSeasonParticipation = QuizzerSeasonParticipation & {
  readiness: 'ready';
};

export type ReadyParticipationParseResult =
  | { ok: true; participation: ReadyQuizzerSeasonParticipation }
  | { ok: false; field: string };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.trim() === value;
}

function hasExactFields(row: Record<string, unknown>, fields: readonly string[]): boolean {
  const keys = Object.keys(row);
  if (keys.length !== fields.length) {
    return false;
  }
  return fields.every((field) => Object.prototype.hasOwnProperty.call(row, field));
}

function sharedIdentityInvalid(row: Record<string, unknown>): string | undefined {
  if (!isNonEmptyString(row.quizzerId)) {
    return 'quizzerId';
  }
  if (!isNonEmptyString(row.seasonId)) {
    return 'seasonId';
  }
  if (!isNonEmptyString(row.regionId)) {
    return 'regionId';
  }
  if (row.readiness !== 'ready') {
    return 'readiness';
  }
  return undefined;
}

export function parseReadyParticipationRecord(value: unknown): ReadyParticipationParseResult {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, field: 'document' };
  }

  const row = value as Record<string, unknown>;

  if (row.participationType === 'competitive') {
    if (!hasExactFields(row, COMPETITIVE_FIELDS)) {
      return { ok: false, field: 'document' };
    }
    const identityIssue = sharedIdentityInvalid(row);
    if (identityIssue) {
      return { ok: false, field: identityIssue };
    }
    if (!isDivisionId(row.divisionId)) {
      return { ok: false, field: 'divisionId' };
    }
    const divisionId: DivisionId = row.divisionId;
    return {
      ok: true,
      participation: {
        quizzerId: row.quizzerId as string,
        seasonId: row.seasonId as string,
        regionId: row.regionId as string,
        readiness: 'ready',
        participationType: 'competitive',
        divisionId,
      },
    };
  }

  if (row.participationType === 'studyTrack') {
    if (!hasExactFields(row, STUDY_TRACK_FIELDS)) {
      return { ok: false, field: 'document' };
    }
    const identityIssue = sharedIdentityInvalid(row);
    if (identityIssue) {
      return { ok: false, field: identityIssue };
    }
    if (!isNonEmptyString(row.studyTrackMaterialSetId)) {
      return { ok: false, field: 'studyTrackMaterialSetId' };
    }
    return {
      ok: true,
      participation: {
        quizzerId: row.quizzerId as string,
        seasonId: row.seasonId as string,
        regionId: row.regionId as string,
        readiness: 'ready',
        participationType: 'studyTrack',
        studyTrackMaterialSetId: row.studyTrackMaterialSetId,
      },
    };
  }

  return { ok: false, field: 'participationType' };
}
