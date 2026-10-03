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
import {
  deriveSeasonSetupPlacement,
  INITIAL_SEASON_SETUP_STATE,
  seasonSetupWizardReducer,
  type SeasonSetupPlacement,
  type SeasonSetupStepPlan,
  type SeasonSetupWizardState,
} from '../application';
import type { DivisionId } from '../domain/division';
import {
  resolveStudyTrackChoices,
  type SeasonSetupStudyTrackOption,
  type StudyTrackChoicesResult,
} from '../utils/resolveStudyTrackChoices';

export interface SeasonSetupContextValue {
  /** Resolved season id held by the wizard. Null until a valid id is injected. */
  seasonId: string | null;
  /** Canonical season calendar date used for the January 1 question. */
  calendarDate: string;
  wizard: SeasonSetupWizardState;
  steps: SeasonSetupStepPlan;
  placement: SeasonSetupPlacement;
  studyTrackChoices: StudyTrackChoicesResult;
  setEligibilityAge(eligibilityAge: number): void;
  setFirstYearQuizzer(isFirstYearQuizzer: boolean): void;
  setCompetitiveDivision(divisionId: DivisionId): void;
  setStudyTrackMaterialSet(studyTrackMaterialSetId: string): void;
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
   * Study Track catalog. Phase 3C.3 maps the season's MaterialSets into this list.
   * Missing or unusable catalogs fail closed in the view model.
   */
  studyTrackOptions?: readonly SeasonSetupStudyTrackOption[] | null;
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

  const steps = useMemo(() => deriveSeasonSetupSteps(wizard), [wizard]);
  const placement = useMemo(() => deriveSeasonSetupPlacement(wizard), [wizard]);
  const studyTrackChoices = useMemo(
    () => resolveStudyTrackChoices(wizard.eligibilityAge, studyTrackOptions),
    [wizard.eligibilityAge, studyTrackOptions],
  );

  const value = useMemo<SeasonSetupContextValue>(
    () => ({
      seasonId: wizard.resolvedSeasonId,
      calendarDate,
      wizard,
      steps,
      placement,
      studyTrackChoices,
      setEligibilityAge,
      setFirstYearQuizzer,
      setCompetitiveDivision,
      setStudyTrackMaterialSet,
    }),
    [
      wizard,
      calendarDate,
      steps,
      placement,
      studyTrackChoices,
      setEligibilityAge,
      setFirstYearQuizzer,
      setCompetitiveDivision,
      setStudyTrackMaterialSet,
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
