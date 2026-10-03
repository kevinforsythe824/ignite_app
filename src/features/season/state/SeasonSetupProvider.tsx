import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import type { ReactNode } from 'react';

import { deriveSeasonSetupSteps } from '../application/deriveSeasonSetupSteps';
import { isSeasonSetupOpaqueId } from '../application/seasonSetupOpaqueId';
import { isSeasonSetupRequestReady } from '../application/seasonSetupRequestReady';
import {
  deriveSeasonSetupPlacement,
  INITIAL_SEASON_SETUP_STATE,
  seasonSetupWizardReducer,
  type SeasonSetupPlacement,
  type SeasonSetupStepPlan,
  type SeasonSetupWizardState,
} from '../application';
import type { DivisionId } from '../domain/division';
import type { OfficialRegionConfig } from '../domain/region';
import {
  resolveStudyTrackChoices,
  type SeasonSetupStudyTrackOption,
  type StudyTrackChoicesResult,
} from '../utils/resolveStudyTrackChoices';

export interface SeasonSetupContextValue {
  /** Resolved season id held by the wizard. Null until a valid id is injected. */
  seasonId: string | null;
  /** Injected session identity. The navigator resets when this changes. */
  sessionIdentityKey: string | null;
  /** Canonical season calendar date used for the January 1 question. */
  calendarDate: string;
  wizard: SeasonSetupWizardState;
  steps: SeasonSetupStepPlan;
  placement: SeasonSetupPlacement;
  studyTrackChoices: StudyTrackChoicesResult;
  /** Validated Region catalog, including inactive official rows. Null until loaded. */
  regions: readonly OfficialRegionConfig[] | null;
  setEligibilityAge(eligibilityAge: number): void;
  setFirstYearQuizzer(isFirstYearQuizzer: boolean): void;
  setCompetitiveDivision(divisionId: DivisionId): void;
  setStudyTrackMaterialSet(studyTrackMaterialSetId: string): void;
  setRegion(regionId: string): void;
  /** False when the participation request is not ready or a submission is already in flight. */
  startSubmission(): boolean;
  completeSubmission(): void;
  failSubmission(): void;
}

const SeasonSetupContext = createContext<SeasonSetupContextValue | undefined>(undefined);

export interface SeasonSetupProviderProps {
  children: ReactNode;
  /** Opaque season id from the app current-season resolver. Not loaded here. */
  resolvedSeasonId: string | null;
  /** Canonical calendar date paired with that season. Not a birthday. */
  calendarDate: string;
  /**
   * Injected session identity. Changing it drops in-memory answers.
   * This provider does not read Auth.
   */
  sessionIdentityKey: string | null;
  /**
   * Study Track catalog. Mapped from the season's MaterialSets.
   * Missing or unusable catalogs fail closed in the view model.
   */
  studyTrackOptions?: readonly SeasonSetupStudyTrackOption[] | null;
  /**
   * Validated Region catalog for the resolved Season.
   * Inactive official rows may be present. The Region screen offers active rows only.
   */
  regions?: readonly OfficialRegionConfig[] | null;
}

function wizardStateForSeason(resolvedSeasonId: string | null): SeasonSetupWizardState {
  if (!isSeasonSetupOpaqueId(resolvedSeasonId)) {
    return INITIAL_SEASON_SETUP_STATE;
  }
  return seasonSetupWizardReducer(INITIAL_SEASON_SETUP_STATE, {
    type: 'setResolvedSeason',
    seasonId: resolvedSeasonId,
  });
}

/**
 * Memory-only Season Setup state for the early eligibility flow.
 * Uses seasonSetupWizardReducer. Does not persist, authenticate, or call Firebase.
 * Resets when the resolved Season id or the injected session identity changes.
 */
export function SeasonSetupProvider({
  children,
  resolvedSeasonId,
  calendarDate,
  sessionIdentityKey,
  studyTrackOptions = null,
  regions = null,
}: SeasonSetupProviderProps): React.JSX.Element {
  const [wizard, dispatch] = useReducer(
    seasonSetupWizardReducer,
    resolvedSeasonId,
    wizardStateForSeason,
  );
  const identityRef = useRef({ resolvedSeasonId, sessionIdentityKey });

  useEffect(() => {
    if (
      identityRef.current.resolvedSeasonId === resolvedSeasonId &&
      identityRef.current.sessionIdentityKey === sessionIdentityKey
    ) {
      return;
    }
    identityRef.current = { resolvedSeasonId, sessionIdentityKey };
    dispatch({ type: 'reset' });
    if (isSeasonSetupOpaqueId(resolvedSeasonId)) {
      dispatch({ type: 'setResolvedSeason', seasonId: resolvedSeasonId });
    }
  }, [resolvedSeasonId, sessionIdentityKey]);

  const setEligibilityAge = useCallback((eligibilityAge: number) => {
    if (!Number.isFinite(eligibilityAge) || !Number.isInteger(eligibilityAge)) {
      return;
    }
    dispatch({ type: 'setEligibilityAge', eligibilityAge });
  }, []);

  const setFirstYearQuizzer = useCallback((isFirstYearQuizzer: boolean) => {
    dispatch({ type: 'setFirstYearQuizzer', isFirstYearQuizzer });
  }, []);

  const setCompetitiveDivision = useCallback((divisionId: DivisionId) => {
    dispatch({ type: 'setCompetitiveDivision', divisionId });
  }, []);

  const setStudyTrackMaterialSet = useCallback((studyTrackMaterialSetId: string) => {
    dispatch({ type: 'setStudyTrackMaterialSet', studyTrackMaterialSetId });
  }, []);

  const setRegion = useCallback((regionId: string) => {
    dispatch({ type: 'setRegion', regionId });
  }, []);

  const startSubmission = useCallback(() => {
    if (
      wizard.submission.status === 'submitting' ||
      wizard.submission.status === 'complete' ||
      !isSeasonSetupRequestReady(wizard)
    ) {
      return false;
    }
    dispatch({ type: 'submissionStarted' });
    return true;
  }, [wizard]);

  const completeSubmission = useCallback(() => {
    dispatch({ type: 'submissionCompleted' });
  }, []);

  const failSubmission = useCallback(() => {
    dispatch({ type: 'submissionFailed' });
  }, []);

  const steps = useMemo(() => deriveSeasonSetupSteps(wizard), [wizard]);
  const placement = useMemo(() => deriveSeasonSetupPlacement(wizard), [wizard]);
  const studyTrackChoices = useMemo(
    () => resolveStudyTrackChoices(wizard.eligibilityAge, studyTrackOptions),
    [wizard.eligibilityAge, studyTrackOptions],
  );

  const value = useMemo<SeasonSetupContextValue>(
    () => ({
      seasonId: wizard.resolvedSeasonId,
      sessionIdentityKey,
      calendarDate,
      wizard,
      steps,
      placement,
      studyTrackChoices,
      regions,
      setEligibilityAge,
      setFirstYearQuizzer,
      setCompetitiveDivision,
      setStudyTrackMaterialSet,
      setRegion,
      startSubmission,
      completeSubmission,
      failSubmission,
    }),
    [
      wizard,
      sessionIdentityKey,
      calendarDate,
      steps,
      placement,
      studyTrackChoices,
      regions,
      setEligibilityAge,
      setFirstYearQuizzer,
      setCompetitiveDivision,
      setStudyTrackMaterialSet,
      setRegion,
      startSubmission,
      completeSubmission,
      failSubmission,
    ],
  );

  return (
    <SeasonSetupContext.Provider value={value}>{children}</SeasonSetupContext.Provider>
  );
}

export function useSeasonSetup(): SeasonSetupContextValue {
  const value = useContext(SeasonSetupContext);
  if (value === undefined) {
    throw new Error('useSeasonSetup must be used within SeasonSetupProvider');
  }
  return value;
}
