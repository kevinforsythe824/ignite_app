import { isDivisionId, type DivisionId } from './division';
import type { RegionId } from './region';
import { isContentImmutable, type SeasonStatus } from './season';

/**
 * Season-scoped participation — separate from QuizzerProfile (PRD §§8, 11).
 * Eligibility inputs (eligibilityAge, isFirstYearQuizzer) are NOT stored here.
 * Cross-season key is quizzerId + seasonId.
 */
export type ParticipationType = 'competitive' | 'studyTrack';

export type ParticipationReadiness = 'incomplete' | 'ready';

interface ParticipationBase {
  quizzerId: string;
  seasonId: string;
  regionId: RegionId;
  readiness: ParticipationReadiness;
}

export type QuizzerSeasonParticipation =
  | (ParticipationBase & {
      participationType: 'competitive';
      divisionId: DivisionId;
    })
  | (ParticipationBase & {
      participationType: 'studyTrack';
      studyTrackMaterialSetId: string;
    });

export class ParticipationInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParticipationInvariantError';
  }
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ParticipationInvariantError(`${field} must be a non-empty string`);
  }
  return value;
}

/**
 * Runtime XOR: competitive has divisionId only; studyTrack has studyTrackMaterialSetId only.
 * Accepts untyped input so persistence/draft objects can be checked before they are trusted.
 */
export function assertValidQuizzerSeasonParticipation(
  value: unknown,
): asserts value is QuizzerSeasonParticipation {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ParticipationInvariantError('Participation must be an object');
  }

  const row = value as Record<string, unknown>;
  requireNonEmptyString(row.quizzerId, 'quizzerId');
  requireNonEmptyString(row.seasonId, 'seasonId');
  requireNonEmptyString(row.regionId, 'regionId');

  if (row.readiness !== 'incomplete' && row.readiness !== 'ready') {
    throw new ParticipationInvariantError('readiness must be "incomplete" or "ready"');
  }

  if ('eligibilityAge' in row || 'isFirstYearQuizzer' in row || 'dateOfBirth' in row) {
    throw new ParticipationInvariantError(
      'Eligibility inputs must not be persisted on durable participation',
    );
  }

  if (row.participationType === 'competitive') {
    if (!isDivisionId(row.divisionId)) {
      throw new ParticipationInvariantError('competitive participation requires a valid divisionId');
    }
    if (row.studyTrackMaterialSetId !== undefined) {
      throw new ParticipationInvariantError(
        'competitive participation must not include studyTrackMaterialSetId',
      );
    }
    return;
  }

  if (row.participationType === 'studyTrack') {
    requireNonEmptyString(row.studyTrackMaterialSetId, 'studyTrackMaterialSetId');
    if (row.divisionId !== undefined) {
      throw new ParticipationInvariantError(
        'studyTrack participation must not include divisionId',
      );
    }
    return;
  }

  throw new ParticipationInvariantError(
    'participationType must be "competitive" or "studyTrack"',
  );
}

export function isValidQuizzerSeasonParticipation(
  value: unknown,
): value is QuizzerSeasonParticipation {
  try {
    assertValidQuizzerSeasonParticipation(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Placement (type + division or Study Track set) does not change while the
 * season is Active/Locked or Archived. Phase 3 will call this on mutations.
 */
export function assertParticipationImmutableDuringActiveSeason(
  current: QuizzerSeasonParticipation,
  next: QuizzerSeasonParticipation,
  seasonStatus: SeasonStatus,
): void {
  if (!isContentImmutable(seasonStatus)) {
    return;
  }

  if (current.quizzerId !== next.quizzerId || current.seasonId !== next.seasonId) {
    throw new ParticipationInvariantError(
      'Participation identity (quizzerId + seasonId) cannot change',
    );
  }

  if (current.participationType !== next.participationType) {
    throw new ParticipationInvariantError(
      'Participation type cannot change during an active or archived season',
    );
  }

  if (current.participationType === 'competitive' && next.participationType === 'competitive') {
    if (current.divisionId !== next.divisionId) {
      throw new ParticipationInvariantError(
        'Division cannot change during an active or archived season',
      );
    }
  }

  if (current.participationType === 'studyTrack' && next.participationType === 'studyTrack') {
    if (current.studyTrackMaterialSetId !== next.studyTrackMaterialSetId) {
      throw new ParticipationInvariantError(
        'Study Track cannot change during an active or archived season',
      );
    }
  }
}
