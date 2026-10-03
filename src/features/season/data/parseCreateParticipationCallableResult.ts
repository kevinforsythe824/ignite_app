import type { CreateQuizzerSeasonParticipationRequest } from '../application/buildCreateParticipationRequest';
import {
  parseReadyParticipationRecord,
  type ReadyQuizzerSeasonParticipation,
} from '../domain/readyParticipationRecord';
import { SeasonSetupSubmissionError } from '../errors/seasonSetupSubmissionError';

export interface CreateParticipationResult {
  readonly participation: ReadyQuizzerSeasonParticipation;
  readonly created: boolean;
}

function unexpected(): never {
  throw new SeasonSetupSubmissionError('unexpected');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Treats the callable payload as untrusted.
 * created:false is a successful existing participation when the record is valid
 * and belongs to the requested Season. Placement fields are not re-checked
 * against the client request.
 */
export function parseCreateParticipationCallableResult(
  value: unknown,
  request: CreateQuizzerSeasonParticipationRequest,
): CreateParticipationResult {
  if (!isPlainObject(value)) {
    unexpected();
  }
  const keys = Object.keys(value);
  if (keys.length !== 2 || !Object.prototype.hasOwnProperty.call(value, 'created')) {
    unexpected();
  }
  if (!Object.prototype.hasOwnProperty.call(value, 'participation')) {
    unexpected();
  }
  if (typeof value.created !== 'boolean') {
    unexpected();
  }

  const parsed = parseReadyParticipationRecord(value.participation);
  if (!parsed.ok || parsed.participation.seasonId !== request.seasonId) {
    unexpected();
  }

  return {
    created: value.created,
    participation: parsed.participation,
  };
}
