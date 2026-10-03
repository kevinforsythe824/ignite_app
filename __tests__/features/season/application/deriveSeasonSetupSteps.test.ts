import { buildCreateParticipationRequest } from '../../../../src/features/season/application/buildCreateParticipationRequest';
import { deriveSeasonSetupSteps } from '../../../../src/features/season/application/deriveSeasonSetupSteps';
import {
  INITIAL_SEASON_SETUP_STATE,
  seasonSetupWizardReducer,
  type SeasonSetupWizardAction,
  type SeasonSetupWizardState,
} from '../../../../src/features/season/application/seasonSetupWizard';

const SEASON_ID = '2034';
const REGION_ID = 'region-fixture-north';
const STUDY_TRACK_ID = 'fixture-ms-alpha';

function apply(actions: readonly SeasonSetupWizardAction[]): SeasonSetupWizardState {
  return actions.reduce(seasonSetupWizardReducer, INITIAL_SEASON_SETUP_STATE);
}

describe('deriveSeasonSetupSteps', () => {
  it('keeps an unanswered or ineligible age on the age step', () => {
    expect(deriveSeasonSetupSteps(INITIAL_SEASON_SETUP_STATE)).toEqual({
      steps: ['eligibilityAge'],
      currentStep: 'eligibilityAge',
    });
    expect(
      deriveSeasonSetupSteps(apply([{ type: 'setEligibilityAge', eligibilityAge: 1 }])),
    ).toEqual({
      steps: ['eligibilityAge'],
      currentStep: 'eligibilityAge',
    });
  });

  it('walks age 3 through placement and region, and does not finish without a season', () => {
    const aged = apply([{ type: 'setEligibilityAge', eligibilityAge: 3 }]);
    expect(deriveSeasonSetupSteps(aged)).toEqual({
      steps: ['eligibilityAge', 'placementChoice', 'region', 'review'],
      currentStep: 'placementChoice',
    });

    const chosen = seasonSetupWizardReducer(aged, {
      type: 'setCompetitiveDivision',
      divisionId: 'cadet',
    });
    expect(deriveSeasonSetupSteps(chosen).currentStep).toBe('region');

    const withRegion = seasonSetupWizardReducer(chosen, {
      type: 'setRegion',
      regionId: REGION_ID,
    });
    const blocked = seasonSetupWizardReducer(withRegion, { type: 'submissionCompleted' });
    expect(blocked).toBe(withRegion);
    expect(blocked.submission).toEqual({ status: 'idle' });
    expect(buildCreateParticipationRequest(blocked)).toEqual({
      status: 'invalid',
      reason: 'missingSeason',
    });
    expect(deriveSeasonSetupSteps(blocked)).toEqual({
      steps: ['eligibilityAge', 'placementChoice', 'region'],
      currentStep: 'region',
    });

    const forcedComplete: SeasonSetupWizardState = {
      ...blocked,
      submission: { status: 'complete' },
    };
    expect(buildCreateParticipationRequest(forcedComplete)).toEqual({
      status: 'invalid',
      reason: 'missingSeason',
    });
    expect(deriveSeasonSetupSteps(forcedComplete)).toEqual({
      steps: ['eligibilityAge', 'placementChoice', 'region'],
      currentStep: 'region',
    });
  });

  it('skips a choice step for derived Junior at age 10', () => {
    const plan = deriveSeasonSetupSteps(apply([{ type: 'setEligibilityAge', eligibilityAge: 10 }]));
    expect(plan.steps).toEqual(['eligibilityAge', 'region', 'review']);
    expect(plan.steps).not.toContain('placementChoice');
    expect(plan.currentStep).toBe('region');
  });

  it('stops age 16 on First Year until it is answered, then continues to region', () => {
    const unanswered = apply([{ type: 'setEligibilityAge', eligibilityAge: 16 }]);
    expect(unanswered.isFirstYearQuizzer).toBeNull();
    expect(deriveSeasonSetupSteps(unanswered)).toEqual({
      steps: ['eligibilityAge', 'firstYear'],
      currentStep: 'firstYear',
    });

    const answered = seasonSetupWizardReducer(unanswered, {
      type: 'setFirstYearQuizzer',
      isFirstYearQuizzer: false,
    });
    expect(deriveSeasonSetupSteps(answered)).toEqual({
      steps: ['eligibilityAge', 'firstYear', 'region', 'review'],
      currentStep: 'region',
    });
    expect(deriveSeasonSetupSteps(answered).steps).not.toContain('placementChoice');
  });

  it('walks age 25 through Study Track, region, and review', () => {
    const aged = apply([{ type: 'setEligibilityAge', eligibilityAge: 25 }]);
    expect(deriveSeasonSetupSteps(aged)).toEqual({
      steps: ['eligibilityAge', 'studyTrack', 'region', 'review'],
      currentStep: 'studyTrack',
    });

    const selected = seasonSetupWizardReducer(aged, {
      type: 'setStudyTrackMaterialSet',
      studyTrackMaterialSetId: STUDY_TRACK_ID,
    });
    expect(deriveSeasonSetupSteps(selected).currentStep).toBe('region');
    expect(deriveSeasonSetupSteps(selected).steps).not.toContain('placementChoice');
  });

  it('reaches review and complete only when the participation request is ready', () => {
    const ready = apply([
      { type: 'setResolvedSeason', seasonId: SEASON_ID },
      { type: 'setEligibilityAge', eligibilityAge: 3 },
      { type: 'setCompetitiveDivision', divisionId: 'cadet' },
      { type: 'setRegion', regionId: REGION_ID },
    ]);
    expect(buildCreateParticipationRequest(ready).status).toBe('ready');
    expect(deriveSeasonSetupSteps(ready)).toEqual({
      steps: ['eligibilityAge', 'placementChoice', 'region', 'review'],
      currentStep: 'review',
    });

    const submitting = seasonSetupWizardReducer(ready, { type: 'submissionStarted' });
    expect(deriveSeasonSetupSteps(submitting).currentStep).toBe('review');
    expect(deriveSeasonSetupSteps(submitting).steps).not.toContain('complete');

    const failed = seasonSetupWizardReducer(submitting, { type: 'submissionFailed' });
    expect(failed.submission).toEqual({ status: 'failed' });
    expect(deriveSeasonSetupSteps(failed)).toEqual({
      steps: ['eligibilityAge', 'placementChoice', 'region', 'review'],
      currentStep: 'review',
    });

    const done = seasonSetupWizardReducer(failed, { type: 'submissionCompleted' });
    expect(done.submission).toEqual({ status: 'complete' });
    expect(deriveSeasonSetupSteps(done)).toEqual({
      steps: ['eligibilityAge', 'placementChoice', 'region', 'review', 'complete'],
      currentStep: 'complete',
    });
  });

  it('does not surface review for a stale single-option division', () => {
    const stale: SeasonSetupWizardState = {
      ...INITIAL_SEASON_SETUP_STATE,
      resolvedSeasonId: SEASON_ID,
      eligibilityAge: 10,
      competitiveDivisionId: 'junior',
      regionId: REGION_ID,
      submission: { status: 'complete' },
    };
    expect(buildCreateParticipationRequest(stale)).toEqual({
      status: 'invalid',
      reason: 'stalePlacement',
    });
    expect(deriveSeasonSetupSteps(stale)).toEqual({
      steps: ['eligibilityAge', 'region'],
      currentStep: 'region',
    });
    expect(stale.competitiveDivisionId).toBe('junior');
  });

  it('does not treat a stale first-year answer outside 15–18 as review-ready', () => {
    const stale: SeasonSetupWizardState = {
      ...INITIAL_SEASON_SETUP_STATE,
      resolvedSeasonId: SEASON_ID,
      eligibilityAge: 10,
      isFirstYearQuizzer: true,
      regionId: REGION_ID,
    };
    expect(buildCreateParticipationRequest(stale)).toEqual({
      status: 'invalid',
      reason: 'stalePlacement',
    });
    const plan = deriveSeasonSetupSteps(stale);
    expect(plan.steps).not.toContain('review');
    expect(plan.currentStep).not.toBe('review');
    expect(plan.currentStep).not.toBe('complete');
    expect(stale.isFirstYearQuizzer).toBe(true);
  });

  it('never surfaces review or complete for an invalid season id', () => {
    const invalidSeason: SeasonSetupWizardState = {
      ...INITIAL_SEASON_SETUP_STATE,
      resolvedSeasonId: 'bad/id',
      eligibilityAge: 10,
      regionId: REGION_ID,
      submission: { status: 'complete' },
    };
    expect(buildCreateParticipationRequest(invalidSeason)).toEqual({
      status: 'invalid',
      reason: 'missingSeason',
    });
    const plan = deriveSeasonSetupSteps(invalidSeason);
    expect(plan.steps).not.toContain('review');
    expect(plan.steps).not.toContain('complete');
    expect(plan.currentStep).not.toBe('review');
    expect(plan.currentStep).not.toBe('complete');
  });
});
