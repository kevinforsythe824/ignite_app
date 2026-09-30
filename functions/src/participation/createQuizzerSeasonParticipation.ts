import { isDivisionId, type DivisionId } from '../../../src/features/season/domain/division';
import { resolveParticipationOptions } from '../../../src/features/season/domain/eligibility/resolveParticipationOptions';
import type { QuizzerSeasonParticipation } from '../../../src/features/season/domain/quizzerSeasonParticipation';
import type { ReadyQuizzerSeasonParticipation } from '../../../src/features/season/domain/readyParticipationRecord';
import {
  resolveCurrentSeason,
  type CurrentSeasonResult,
} from '../../../src/features/season/domain/resolveCurrentSeason';
import { resolveStudyMaterialSet } from '../../../src/features/season/domain/resolveStudyMaterialSet';
import type { Season } from '../../../src/features/season/domain/season';
import type { SeasonSelectionPolicy } from '../../../src/features/season/domain/seasonSelectionPolicy';
import { validateOfficialRegionCatalog } from '../../../src/features/season/domain/validateOfficialRegionCatalog';
import type { FirestoreQuizzerSeasonParticipationDocument } from '../../../src/features/season/data/firestoreQuizzerSeasonParticipationDocument';
import {
  buildReadyParticipationDocument,
  InvalidParticipationDocumentError,
  mapFirestoreQuizzerSeasonParticipationToDomain,
} from '../../../src/features/season/data/mapFirestoreQuizzerSeasonParticipation';

import { ParticipationCreateError } from './participationCreateError';

const REQUEST_FIELDS = [
  'divisionId',
  'eligibilityAge',
  'isFirstYearQuizzer',
  'regionId',
  'seasonId',
  'studyTrackMaterialSetId',
] as const;

export interface SeasonParticipationCatalogPort {
  listSeasons(): Promise<readonly unknown[]>;
  listMaterialSets(seasonId: string): Promise<readonly unknown[]>;
  listRegions(seasonId: string): Promise<readonly unknown[]>;
}

export type ParticipationReadOutcome =
  | { status: 'missing' }
  | { status: 'present'; data: unknown };

export type ParticipationCreateOutcome =
  | { status: 'created'; document: FirestoreQuizzerSeasonParticipationDocument }
  | { status: 'existing'; document: FirestoreQuizzerSeasonParticipationDocument }
  | { status: 'existing-malformed' };

export interface ParticipationCreatePort {
  read(userId: string, seasonId: string): Promise<ParticipationReadOutcome>;
  createIfMissing(
    userId: string,
    seasonId: string,
    document: FirestoreQuizzerSeasonParticipationDocument,
  ): Promise<ParticipationCreateOutcome>;
}

export interface CreateQuizzerSeasonParticipationDeps {
  authenticatedUid: string | null;
  /** Injected YYYY-MM-DD. Not taken from the client request. */
  today: string;
  selectionPolicy: SeasonSelectionPolicy;
  catalog: SeasonParticipationCatalogPort;
  participation: ParticipationCreatePort;
}

export interface CreateQuizzerSeasonParticipationResult {
  participation: QuizzerSeasonParticipation;
  created: boolean;
}

interface ParsedCreateRequest {
  seasonId: string;
  eligibilityAge: number;
  regionId: string;
  isFirstYearQuizzer?: boolean;
  divisionId?: string;
  studyTrackMaterialSetId?: string;
}

type Placement =
  | { participationType: 'competitive'; divisionId: DivisionId }
  | { participationType: 'studyTrack'; studyTrackMaterialSetId: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSafeId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.trim() === value &&
    !value.includes('/')
  );
}

async function load<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof ParticipationCreateError) {
      throw error;
    }
    throw new ParticipationCreateError('persistence-failure');
  }
}

function requireAuthenticatedUid(authenticatedUid: string | null): string {
  if (!isSafeId(authenticatedUid)) {
    throw new ParticipationCreateError('unauthenticated');
  }
  return authenticatedUid;
}

function readRequestedSeasonId(data: unknown): string {
  if (!isPlainObject(data) || !isSafeId(data.seasonId)) {
    throw new ParticipationCreateError('malformed-input');
  }
  return data.seasonId;
}

function requireCurrentSeason(resolved: CurrentSeasonResult, seasonId: string): Season {
  if (resolved.status === 'invalid') {
    throw new ParticipationCreateError('season-config-invalid');
  }
  if (resolved.status === 'none') {
    throw new ParticipationCreateError('no-current-season');
  }
  if (resolved.status === 'ambiguous') {
    throw new ParticipationCreateError('season-ambiguous');
  }
  if (resolved.season.seasonId !== seasonId) {
    throw new ParticipationCreateError('wrong-season');
  }
  return resolved.season;
}

function mapExistingOrThrow(
  data: unknown,
  userId: string,
  seasonId: string,
): QuizzerSeasonParticipation {
  try {
    return mapFirestoreQuizzerSeasonParticipationToDomain(data, userId, seasonId);
  } catch (error) {
    if (error instanceof InvalidParticipationDocumentError) {
      throw new ParticipationCreateError('existing-participation-invalid');
    }
    throw new ParticipationCreateError('persistence-failure');
  }
}

function parseCreateRequest(data: unknown): ParsedCreateRequest {
  if (!isPlainObject(data)) {
    throw new ParticipationCreateError('malformed-input');
  }

  const allowed = new Set<string>(REQUEST_FIELDS);
  for (const key of Object.keys(data)) {
    if (!allowed.has(key)) {
      throw new ParticipationCreateError('malformed-input');
    }
  }

  if (!isSafeId(data.seasonId) || !isSafeId(data.regionId)) {
    throw new ParticipationCreateError('malformed-input');
  }
  if (typeof data.eligibilityAge !== 'number') {
    throw new ParticipationCreateError('malformed-input');
  }
  if (
    data.isFirstYearQuizzer !== undefined &&
    typeof data.isFirstYearQuizzer !== 'boolean'
  ) {
    throw new ParticipationCreateError('malformed-input');
  }
  if (data.divisionId !== undefined && !isSafeId(data.divisionId)) {
    throw new ParticipationCreateError('malformed-input');
  }
  if (
    data.studyTrackMaterialSetId !== undefined &&
    !isSafeId(data.studyTrackMaterialSetId)
  ) {
    throw new ParticipationCreateError('malformed-input');
  }

  return {
    seasonId: data.seasonId,
    eligibilityAge: data.eligibilityAge,
    regionId: data.regionId,
    isFirstYearQuizzer: data.isFirstYearQuizzer as boolean | undefined,
    divisionId: data.divisionId as string | undefined,
    studyTrackMaterialSetId: data.studyTrackMaterialSetId as string | undefined,
  };
}

/**
 * Placement comes from resolveParticipationOptions.
 * A single allowed division is server-derived. The client cannot send it.
 * A longer allowlist is a real choice and must be one of those ids.
 */
function resolvePlacement(request: ParsedCreateRequest): Placement {
  const probe = resolveParticipationOptions({ eligibilityAge: request.eligibilityAge });
  if (probe.status === 'invalid' && probe.reason !== 'firstYearRequired') {
    throw new ParticipationCreateError('eligibility-invalid');
  }

  const firstYearRequired = probe.status === 'invalid';
  if (firstYearRequired) {
    if (typeof request.isFirstYearQuizzer !== 'boolean') {
      throw new ParticipationCreateError('eligibility-invalid');
    }
  } else if (request.isFirstYearQuizzer !== undefined) {
    throw new ParticipationCreateError('eligibility-invalid');
  }

  const options = firstYearRequired
    ? resolveParticipationOptions({
        eligibilityAge: request.eligibilityAge,
        isFirstYearQuizzer: request.isFirstYearQuizzer,
      })
    : probe;

  if (options.status !== 'eligible') {
    throw new ParticipationCreateError('eligibility-invalid');
  }

  if (options.participationType === 'studyTrack') {
    if (request.divisionId !== undefined) {
      throw new ParticipationCreateError('invalid-division-choice');
    }
    if (request.studyTrackMaterialSetId === undefined) {
      throw new ParticipationCreateError('invalid-study-track-material-set');
    }
    return {
      participationType: 'studyTrack',
      studyTrackMaterialSetId: request.studyTrackMaterialSetId,
    };
  }

  if (request.studyTrackMaterialSetId !== undefined) {
    throw new ParticipationCreateError('invalid-study-track-material-set');
  }

  if (options.allowedDivisionIds.length !== 1) {
    if (
      request.divisionId === undefined ||
      !isDivisionId(request.divisionId) ||
      !options.allowedDivisionIds.includes(request.divisionId)
    ) {
      throw new ParticipationCreateError('invalid-division-choice');
    }
    return { participationType: 'competitive', divisionId: request.divisionId };
  }

  if (request.divisionId !== undefined) {
    throw new ParticipationCreateError('invalid-division-choice');
  }

  const divisionId = options.allowedDivisionIds[0];
  if (!divisionId) {
    throw new ParticipationCreateError('invalid-division-choice');
  }
  return { participationType: 'competitive', divisionId };
}

function participationFromPlacement(
  userId: string,
  seasonId: string,
  regionId: string,
  placement: Placement,
): ReadyQuizzerSeasonParticipation {
  if (placement.participationType === 'competitive') {
    return {
      quizzerId: userId,
      seasonId,
      regionId,
      readiness: 'ready',
      participationType: 'competitive',
      divisionId: placement.divisionId,
    };
  }
  return {
    quizzerId: userId,
    seasonId,
    regionId,
    readiness: 'ready',
    participationType: 'studyTrack',
    studyTrackMaterialSetId: placement.studyTrackMaterialSetId,
  };
}

function assertMaterialSetResolves(
  participation: ReadyQuizzerSeasonParticipation,
  materialSets: readonly unknown[],
): void {
  const resolved = resolveStudyMaterialSet(participation, materialSets);
  if (resolved.status === 'resolved') {
    return;
  }
  if (
    resolved.status === 'invalid' &&
    resolved.reason === 'missingTarget' &&
    participation.participationType === 'studyTrack'
  ) {
    throw new ParticipationCreateError('invalid-study-track-material-set');
  }
  throw new ParticipationCreateError('material-set-config-invalid');
}

async function assertActiveCurrentRegion(
  deps: CreateQuizzerSeasonParticipationDeps,
  seasonId: string,
  regionId: string,
): Promise<void> {
  const regionDocuments = await load(() => deps.catalog.listRegions(seasonId));
  const catalog = validateOfficialRegionCatalog(regionDocuments);
  if (catalog.status === 'invalid') {
    throw new ParticipationCreateError('region-config-invalid');
  }
  const selected = catalog.regions.find((region) => region.regionId === regionId);
  if (!selected || !selected.active) {
    throw new ParticipationCreateError('invalid-region');
  }
}

/**
 * Server-authoritative create-only participation.
 * Uid, calendar date, and selection policy are supplied by the composition root.
 */
export async function createQuizzerSeasonParticipation(
  deps: CreateQuizzerSeasonParticipationDeps,
  data: unknown,
): Promise<CreateQuizzerSeasonParticipationResult> {
  const userId = requireAuthenticatedUid(deps.authenticatedUid);
  const seasonId = readRequestedSeasonId(data);
  const seasons = await load(() => deps.catalog.listSeasons());
  const currentSeason = requireCurrentSeason(
    resolveCurrentSeason(seasons, deps.today, deps.selectionPolicy),
    seasonId,
  );

  const existing = await load(() => deps.participation.read(userId, currentSeason.seasonId));
  if (existing.status === 'present') {
    return {
      participation: mapExistingOrThrow(existing.data, userId, currentSeason.seasonId),
      created: false,
    };
  }

  const request = parseCreateRequest(data);
  const placement = resolvePlacement(request);
  const materialSets = await load(() => deps.catalog.listMaterialSets(currentSeason.seasonId));
  const participation = participationFromPlacement(
    userId,
    currentSeason.seasonId,
    request.regionId,
    placement,
  );
  assertMaterialSetResolves(participation, materialSets);
  await assertActiveCurrentRegion(deps, currentSeason.seasonId, request.regionId);

  const document = buildReadyParticipationDocument(participation);
  const outcome = await load(() =>
    deps.participation.createIfMissing(userId, currentSeason.seasonId, document),
  );
  if (outcome.status === 'existing-malformed') {
    throw new ParticipationCreateError('existing-participation-invalid');
  }

  return {
    participation: mapExistingOrThrow(outcome.document, userId, currentSeason.seasonId),
    created: outcome.status === 'created',
  };
}
