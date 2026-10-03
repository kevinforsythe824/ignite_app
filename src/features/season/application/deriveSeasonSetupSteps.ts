import { resolveParticipationOptions } from '../domain/eligibility/resolveParticipationOptions';

import { canAdvanceFromEligibilityAge } from './canAdvanceFromEligibilityAge';
import { isSeasonSetupOpaqueId } from './seasonSetupOpaqueId';
import { isSeasonSetupRequestReady } from './seasonSetupRequestReady';
import type { SeasonSetupWizardState } from './seasonSetupWizard';

/**
 * Wizard concepts in flow order. This is not a navigator and not a screen list
 * stored on the reducer. Later UI maps these ids to screens.
 */
export const SEASON_SETUP_STEP_IDS = [
  'eligibilityAge',
  'placementChoice',
  'firstYear',
  'studyTrack',
  'region',
  'review',
  'complete',
] as const;

export type SeasonSetupStepId = (typeof SEASON_SETUP_STEP_IDS)[number];

export interface SeasonSetupStepPlan {
  readonly steps: readonly SeasonSetupStepId[];
  readonly currentStep: SeasonSetupStepId;
}

function isPlacementChoiceSatisfied(state: SeasonSetupWizardState): boolean {
  if (typeof state.eligibilityAge !== 'number' || state.competitiveDivisionId === null) {
    return false;
  }
  const options = resolveParticipationOptions({ eligibilityAge: state.eligibilityAge });
  return (
    options.status === 'eligible' &&
    options.participationType === 'competitive' &&
    options.allowedDivisionIds.length > 1 &&
    options.allowedDivisionIds.includes(state.competitiveDivisionId)
  );
}

function isDataStepSatisfied(step: SeasonSetupStepId, state: SeasonSetupWizardState): boolean {
  switch (step) {
    case 'eligibilityAge':
      return (
        typeof state.eligibilityAge === 'number' &&
        canAdvanceFromEligibilityAge(state.eligibilityAge)
      );
    case 'placementChoice':
      return isPlacementChoiceSatisfied(state);
    case 'firstYear':
      return typeof state.isFirstYearQuizzer === 'boolean';
    case 'studyTrack':
      return isSeasonSetupOpaqueId(state.studyTrackMaterialSetId);
    case 'region':
      return isSeasonSetupOpaqueId(state.regionId);
    case 'review':
    case 'complete':
      return false;
    default: {
      const unexpected: never = step;
      return unexpected;
    }
  }
}

function currentStepFor(
  steps: readonly SeasonSetupStepId[],
  state: SeasonSetupWizardState,
): SeasonSetupStepId {
  for (const step of steps) {
    if (step === 'complete') {
      return 'complete';
    }
    if (step === 'review') {
      if (state.submission.status !== 'complete') {
        return 'review';
      }
      continue;
    }
    if (!isDataStepSatisfied(step, state)) {
      return step;
    }
  }
  return steps[steps.length - 1] ?? 'eligibilityAge';
}

function plan(steps: SeasonSetupStepId[], state: SeasonSetupWizardState): SeasonSetupStepPlan {
  const requestReady = isSeasonSetupRequestReady(state);
  const dataReady = steps.every(
    (step) => step === 'review' || isDataStepSatisfied(step, state),
  );
  // Earlier steps stay in the discovered sequence. Review is available only
  // once the participation request is ready; otherwise it is not a final step.
  const discovered =
    dataReady && !requestReady ? steps.filter((step) => step !== 'review') : steps;
  const planned =
    dataReady && requestReady && state.submission.status === 'complete'
      ? [...discovered, 'complete' as const]
      : discovered;
  return {
    steps: planned,
    currentStep: currentStepFor(planned, state),
  };
}

/**
 * Step sequence from wizard state and resolveParticipationOptions.
 * Ages 15–18 stop at firstYear until that answer exists, then continue
 * through region and review. A single derived division is not its own step.
 * Review is current only when the participation request is ready.
 * Complete also requires submission status complete.
 */
export function deriveSeasonSetupSteps(state: SeasonSetupWizardState): SeasonSetupStepPlan {
  const steps: SeasonSetupStepId[] = ['eligibilityAge'];
  if (
    typeof state.eligibilityAge !== 'number' ||
    !canAdvanceFromEligibilityAge(state.eligibilityAge)
  ) {
    return plan(steps, state);
  }

  const eligibilityAge = state.eligibilityAge;
  const probe = resolveParticipationOptions({ eligibilityAge });

  if (probe.status === 'invalid' && probe.reason === 'firstYearRequired') {
    steps.push('firstYear');
    if (typeof state.isFirstYearQuizzer !== 'boolean') {
      return plan(steps, state);
    }
    const resolved = resolveParticipationOptions({
      eligibilityAge,
      isFirstYearQuizzer: state.isFirstYearQuizzer,
    });
    if (resolved.status !== 'eligible') {
      return { steps, currentStep: 'firstYear' };
    }
    steps.push('region', 'review');
    return plan(steps, state);
  }

  if (probe.status !== 'eligible') {
    return plan(steps, state);
  }

  if (probe.participationType === 'studyTrack') {
    steps.push('studyTrack', 'region', 'review');
    return plan(steps, state);
  }

  if (probe.allowedDivisionIds.length > 1) {
    steps.push('placementChoice');
  }
  steps.push('region', 'review');
  return plan(steps, state);
}
