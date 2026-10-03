import { isDivisionId, type DivisionId } from '../domain/division';
import { resolveParticipationOptions } from '../domain/eligibility/resolveParticipationOptions';

import { isSeasonSetupOpaqueId } from './seasonSetupOpaqueId';
import { isSeasonSetupRequestReady } from './seasonSetupRequestReady';

/**
 * Memory-only Season Setup answers. Nothing here is written to Firestore.
 * Single-option divisions are derived, not stored.
 * Region is an independent choice and is not placement.
 */
export interface SeasonSetupWizardState {
  resolvedSeasonId: string | null;
  eligibilityAge: number | null;
  isFirstYearQuizzer: boolean | null;
  competitiveDivisionId: DivisionId | null;
  studyTrackMaterialSetId: string | null;
  regionId: string | null;
  submission: SeasonSetupSubmission;
}

export type SeasonSetupSubmission =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'complete' }
  | { status: 'failed' };

export type SeasonSetupWizardAction =
  | { type: 'setEligibilityAge'; eligibilityAge: number }
  | { type: 'setFirstYearQuizzer'; isFirstYearQuizzer: boolean }
  | { type: 'setCompetitiveDivision'; divisionId: DivisionId }
  | { type: 'setStudyTrackMaterialSet'; studyTrackMaterialSetId: string }
  | { type: 'setRegion'; regionId: string }
  | { type: 'setResolvedSeason'; seasonId: string }
  | { type: 'submissionStarted' }
  | { type: 'submissionCompleted' }
  | { type: 'submissionFailed' }
  | { type: 'reset' };

export type SeasonSetupPlacement =
  | { status: 'unresolved' }
  | { status: 'needsFirstYear' }
  | { status: 'needsDivisionChoice' }
  | { status: 'competitive'; divisionId: DivisionId }
  | { status: 'needsStudyTrack' }
  | { status: 'studyTrack'; studyTrackMaterialSetId: string };

function emptyWizardState(resolvedSeasonId: string | null): SeasonSetupWizardState {
  return {
    resolvedSeasonId,
    eligibilityAge: null,
    isFirstYearQuizzer: null,
    competitiveDivisionId: null,
    studyTrackMaterialSetId: null,
    regionId: null,
    submission: { status: 'idle' },
  };
}

export const INITIAL_SEASON_SETUP_STATE: SeasonSetupWizardState = emptyWizardState(null);

/**
 * Derived placement from resolveParticipationOptions.
 * A multi-division age uses the stored choice. A single allowed division
 * comes from the resolver, even if a stale choice is still on the state.
 */
export function deriveSeasonSetupPlacement(state: SeasonSetupWizardState): SeasonSetupPlacement {
  if (typeof state.eligibilityAge !== 'number') {
    return { status: 'unresolved' };
  }

  const probe = resolveParticipationOptions({ eligibilityAge: state.eligibilityAge });
  if (probe.status === 'invalid' && probe.reason === 'firstYearRequired') {
    if (typeof state.isFirstYearQuizzer !== 'boolean') {
      return { status: 'needsFirstYear' };
    }
    const resolved = resolveParticipationOptions({
      eligibilityAge: state.eligibilityAge,
      isFirstYearQuizzer: state.isFirstYearQuizzer,
    });
    if (resolved.status !== 'eligible' || resolved.participationType !== 'competitive') {
      return { status: 'unresolved' };
    }
    const divisionId = resolved.allowedDivisionIds[0];
    if (resolved.allowedDivisionIds.length !== 1 || divisionId === undefined) {
      return { status: 'unresolved' };
    }
    return { status: 'competitive', divisionId };
  }

  if (probe.status !== 'eligible') {
    return { status: 'unresolved' };
  }

  if (probe.participationType === 'studyTrack') {
    if (!isSeasonSetupOpaqueId(state.studyTrackMaterialSetId)) {
      return { status: 'needsStudyTrack' };
    }
    return {
      status: 'studyTrack',
      studyTrackMaterialSetId: state.studyTrackMaterialSetId,
    };
  }

  if (probe.allowedDivisionIds.length === 1) {
    const divisionId = probe.allowedDivisionIds[0];
    if (divisionId === undefined) {
      return { status: 'unresolved' };
    }
    return { status: 'competitive', divisionId };
  }

  if (
    state.competitiveDivisionId !== null &&
    isDivisionId(state.competitiveDivisionId) &&
    probe.allowedDivisionIds.includes(state.competitiveDivisionId)
  ) {
    return { status: 'competitive', divisionId: state.competitiveDivisionId };
  }
  return { status: 'needsDivisionChoice' };
}

function optionsForAge(eligibilityAge: number | null) {
  if (typeof eligibilityAge !== 'number') {
    return resolveParticipationOptions({ eligibilityAge: Number.NaN });
  }
  return resolveParticipationOptions({ eligibilityAge });
}

/**
 * Pure temporary wizard transitions. Does not choose a screen or call Firebase.
 * Changing age drops division, first-year, and Study Track selection.
 * Region stays until reset or a different resolved Season id.
 * submissionCompleted is ignored unless the participation request is ready.
 */
export function seasonSetupWizardReducer(
  state: SeasonSetupWizardState,
  action: SeasonSetupWizardAction,
): SeasonSetupWizardState {
  switch (action.type) {
    case 'setEligibilityAge': {
      if (Object.is(state.eligibilityAge, action.eligibilityAge)) {
        return state;
      }
      return {
        ...state,
        eligibilityAge: action.eligibilityAge,
        isFirstYearQuizzer: null,
        competitiveDivisionId: null,
        studyTrackMaterialSetId: null,
        submission: { status: 'idle' },
      };
    }
    case 'setFirstYearQuizzer': {
      const options = optionsForAge(state.eligibilityAge);
      if (!(options.status === 'invalid' && options.reason === 'firstYearRequired')) {
        return state;
      }
      if (state.isFirstYearQuizzer === action.isFirstYearQuizzer) {
        return state;
      }
      return {
        ...state,
        isFirstYearQuizzer: action.isFirstYearQuizzer,
        submission: { status: 'idle' },
      };
    }
    case 'setCompetitiveDivision': {
      const options = optionsForAge(state.eligibilityAge);
      if (
        options.status !== 'eligible' ||
        options.participationType !== 'competitive' ||
        options.allowedDivisionIds.length <= 1 ||
        !options.allowedDivisionIds.includes(action.divisionId)
      ) {
        return state;
      }
      if (state.competitiveDivisionId === action.divisionId) {
        return state;
      }
      return {
        ...state,
        competitiveDivisionId: action.divisionId,
        submission: { status: 'idle' },
      };
    }
    case 'setStudyTrackMaterialSet': {
      const options = optionsForAge(state.eligibilityAge);
      if (options.status !== 'eligible' || options.participationType !== 'studyTrack') {
        return state;
      }
      if (!isSeasonSetupOpaqueId(action.studyTrackMaterialSetId)) {
        return state;
      }
      if (state.studyTrackMaterialSetId === action.studyTrackMaterialSetId) {
        return state;
      }
      return {
        ...state,
        studyTrackMaterialSetId: action.studyTrackMaterialSetId,
        submission: { status: 'idle' },
      };
    }
    case 'setRegion': {
      if (!isSeasonSetupOpaqueId(action.regionId)) {
        return state;
      }
      if (state.regionId === action.regionId) {
        return state;
      }
      return {
        ...state,
        regionId: action.regionId,
        submission: { status: 'idle' },
      };
    }
    case 'setResolvedSeason': {
      if (!isSeasonSetupOpaqueId(action.seasonId)) {
        return state;
      }
      if (state.resolvedSeasonId === action.seasonId) {
        return state;
      }
      return emptyWizardState(action.seasonId);
    }
    case 'submissionStarted':
      return { ...state, submission: { status: 'submitting' } };
    case 'submissionCompleted':
      if (!isSeasonSetupRequestReady(state)) {
        return state;
      }
      return { ...state, submission: { status: 'complete' } };
    case 'submissionFailed':
      return { ...state, submission: { status: 'failed' } };
    case 'reset':
      return emptyWizardState(null);
    default: {
      const unexpected: never = action;
      return unexpected;
    }
  }
}
