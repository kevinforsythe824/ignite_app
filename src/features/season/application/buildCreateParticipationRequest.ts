import { isDivisionId, type DivisionId } from '../domain/division';
import {
  resolveParticipationOptions,
  type EligibilityResult,
} from '../domain/eligibility/resolveParticipationOptions';

import { isSeasonSetupOpaqueId } from './seasonSetupOpaqueId';
import type { SeasonSetupWizardState } from './seasonSetupWizard';

/**
 * Client payload for createQuizzerSeasonParticipation.
 * Built only from wizard answers. No uid, quizzer id, date of birth, clock, or timezone.
 * Study Track material set ids are copied through; they are not built from division or season.
 */
export type CreateQuizzerSeasonParticipationRequest =
  | {
      seasonId: string;
      eligibilityAge: number;
      regionId: string;
      divisionId: DivisionId;
    }
  | {
      seasonId: string;
      eligibilityAge: number;
      regionId: string;
    }
  | {
      seasonId: string;
      eligibilityAge: number;
      regionId: string;
      isFirstYearQuizzer: boolean;
    }
  | {
      seasonId: string;
      eligibilityAge: number;
      regionId: string;
      studyTrackMaterialSetId: string;
    };

export type BuildCreateParticipationRequestInvalidReason =
  | 'missingSeason'
  | 'invalidEligibilityAge'
  | 'firstYearRequired'
  | 'missingDivisionChoice'
  | 'divisionNotAllowed'
  | 'missingStudyTrackMaterialSet'
  | 'competitiveWithStudyTrack'
  | 'studyTrackWithDivision'
  | 'missingRegion'
  | 'stalePlacement';

export type BuildCreateParticipationRequestResult =
  | { status: 'ready'; request: CreateQuizzerSeasonParticipationRequest }
  | { status: 'invalid'; reason: BuildCreateParticipationRequestInvalidReason };

function invalid(
  reason: BuildCreateParticipationRequestInvalidReason,
): BuildCreateParticipationRequestResult {
  return { status: 'invalid', reason };
}

function isPresent(value: unknown): boolean {
  return value !== null && value !== undefined;
}

function requireRegion(state: SeasonSetupWizardState): string | BuildCreateParticipationRequestResult {
  if (!isSeasonSetupOpaqueId(state.regionId)) {
    return invalid('missingRegion');
  }
  return state.regionId;
}

function buildFirstYear(
  state: SeasonSetupWizardState,
  seasonId: string,
  eligibilityAge: number,
): BuildCreateParticipationRequestResult {
  if (isPresent(state.studyTrackMaterialSetId)) {
    return invalid('competitiveWithStudyTrack');
  }
  if (isPresent(state.competitiveDivisionId)) {
    return invalid('stalePlacement');
  }
  if (!isPresent(state.isFirstYearQuizzer)) {
    return invalid('firstYearRequired');
  }
  if (typeof state.isFirstYearQuizzer !== 'boolean') {
    return invalid('invalidEligibilityAge');
  }

  const resolved = resolveParticipationOptions({
    eligibilityAge,
    isFirstYearQuizzer: state.isFirstYearQuizzer,
  });
  if (resolved.status !== 'eligible' || resolved.participationType !== 'competitive') {
    return invalid('invalidEligibilityAge');
  }
  if (resolved.allowedDivisionIds.length !== 1) {
    return invalid('stalePlacement');
  }

  const regionId = requireRegion(state);
  if (typeof regionId !== 'string') {
    return regionId;
  }
  return {
    status: 'ready',
    request: {
      seasonId,
      eligibilityAge,
      regionId,
      isFirstYearQuizzer: state.isFirstYearQuizzer,
    },
  };
}

function buildStudyTrack(
  state: SeasonSetupWizardState,
  seasonId: string,
  eligibilityAge: number,
): BuildCreateParticipationRequestResult {
  if (isPresent(state.competitiveDivisionId)) {
    return invalid('studyTrackWithDivision');
  }
  if (isPresent(state.isFirstYearQuizzer)) {
    return invalid('stalePlacement');
  }
  if (!isSeasonSetupOpaqueId(state.studyTrackMaterialSetId)) {
    return invalid('missingStudyTrackMaterialSet');
  }

  const regionId = requireRegion(state);
  if (typeof regionId !== 'string') {
    return regionId;
  }
  return {
    status: 'ready',
    request: {
      seasonId,
      eligibilityAge,
      regionId,
      studyTrackMaterialSetId: state.studyTrackMaterialSetId,
    },
  };
}

function buildCompetitive(
  state: SeasonSetupWizardState,
  seasonId: string,
  eligibilityAge: number,
  options: Extract<EligibilityResult, { status: 'eligible' }>,
): BuildCreateParticipationRequestResult {
  if (isPresent(state.studyTrackMaterialSetId)) {
    return invalid('competitiveWithStudyTrack');
  }
  if (isPresent(state.isFirstYearQuizzer)) {
    return invalid('stalePlacement');
  }

  let divisionId: DivisionId | undefined;
  if (options.allowedDivisionIds.length !== 1) {
    if (!isPresent(state.competitiveDivisionId)) {
      return invalid('missingDivisionChoice');
    }
    if (
      !isDivisionId(state.competitiveDivisionId) ||
      !options.allowedDivisionIds.includes(state.competitiveDivisionId)
    ) {
      return invalid('divisionNotAllowed');
    }
    divisionId = state.competitiveDivisionId;
  } else if (isPresent(state.competitiveDivisionId)) {
    return invalid('stalePlacement');
  }

  const regionId = requireRegion(state);
  if (typeof regionId !== 'string') {
    return regionId;
  }

  if (divisionId !== undefined) {
    return {
      status: 'ready',
      request: { seasonId, eligibilityAge, regionId, divisionId },
    };
  }
  return {
    status: 'ready',
    request: { seasonId, eligibilityAge, regionId },
  };
}

/**
 * Fail closed when the wizard is incomplete or inconsistent.
 * Does not drop stale fields or fill in a derived division the client must omit.
 */
export function buildCreateParticipationRequest(
  state: SeasonSetupWizardState,
): BuildCreateParticipationRequestResult {
  if (!isSeasonSetupOpaqueId(state.resolvedSeasonId)) {
    return invalid('missingSeason');
  }
  if (typeof state.eligibilityAge !== 'number') {
    return invalid('invalidEligibilityAge');
  }

  const seasonId = state.resolvedSeasonId;
  const eligibilityAge = state.eligibilityAge;
  const probe = resolveParticipationOptions({ eligibilityAge });
  if (probe.status === 'invalid' && probe.reason === 'firstYearRequired') {
    return buildFirstYear(state, seasonId, eligibilityAge);
  }
  if (probe.status === 'invalid') {
    return invalid('invalidEligibilityAge');
  }
  if (probe.participationType === 'studyTrack') {
    return buildStudyTrack(state, seasonId, eligibilityAge);
  }
  return buildCompetitive(state, seasonId, eligibilityAge, probe);
}
