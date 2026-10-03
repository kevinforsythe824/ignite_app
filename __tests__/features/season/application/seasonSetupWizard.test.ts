import {
  deriveSeasonSetupPlacement,
  INITIAL_SEASON_SETUP_STATE,
  seasonSetupWizardReducer,
  type SeasonSetupWizardAction,
  type SeasonSetupWizardState,
} from '../../../../src/features/season/application/seasonSetupWizard';

const REGION_ID = 'region-fixture-north';
const STUDY_TRACK_ID = 'fixture-ms-alpha';

function apply(actions: readonly SeasonSetupWizardAction[]): SeasonSetupWizardState {
  return actions.reduce(seasonSetupWizardReducer, INITIAL_SEASON_SETUP_STATE);
}

describe('seasonSetupWizardReducer', () => {
  it('starts empty and keeps a repeated age from clearing a real choice', () => {
    const chosen = apply([
      { type: 'setResolvedSeason', seasonId: '2032' },
      { type: 'setEligibilityAge', eligibilityAge: 3 },
      { type: 'setCompetitiveDivision', divisionId: 'cadet' },
      { type: 'setRegion', regionId: REGION_ID },
    ]);
    const repeated = seasonSetupWizardReducer(chosen, {
      type: 'setEligibilityAge',
      eligibilityAge: 3,
    });
    expect(repeated).toBe(chosen);
    expect(repeated.competitiveDivisionId).toBe('cadet');
    expect(repeated.regionId).toBe(REGION_ID);
  });

  it('clears Cadet when age 3 becomes age 10 and derives Junior', () => {
    const next = apply([
      { type: 'setEligibilityAge', eligibilityAge: 3 },
      { type: 'setCompetitiveDivision', divisionId: 'cadet' },
      { type: 'setRegion', regionId: REGION_ID },
      { type: 'setEligibilityAge', eligibilityAge: 10 },
    ]);
    expect(next.competitiveDivisionId).toBeNull();
    expect(next.isFirstYearQuizzer).toBeNull();
    expect(next.studyTrackMaterialSetId).toBeNull();
    expect(next.regionId).toBe(REGION_ID);
    expect(deriveSeasonSetupPlacement(next)).toEqual({
      status: 'competitive',
      divisionId: 'junior',
    });
  });

  it('clears Study Track when age 20 becomes age 15 and requires first year', () => {
    const next = apply([
      { type: 'setEligibilityAge', eligibilityAge: 20 },
      { type: 'setStudyTrackMaterialSet', studyTrackMaterialSetId: STUDY_TRACK_ID },
      { type: 'setRegion', regionId: REGION_ID },
      { type: 'setEligibilityAge', eligibilityAge: 15 },
    ]);
    expect(next.studyTrackMaterialSetId).toBeNull();
    expect(next.competitiveDivisionId).toBeNull();
    expect(next.isFirstYearQuizzer).toBeNull();
    expect(next.regionId).toBe(REGION_ID);
    expect(deriveSeasonSetupPlacement(next)).toEqual({ status: 'needsFirstYear' });
  });

  it('clears first-year when age 16 becomes age 20 and requires Study Track', () => {
    const next = apply([
      { type: 'setEligibilityAge', eligibilityAge: 16 },
      { type: 'setFirstYearQuizzer', isFirstYearQuizzer: true },
      { type: 'setRegion', regionId: REGION_ID },
      { type: 'setEligibilityAge', eligibilityAge: 20 },
    ]);
    expect(next.isFirstYearQuizzer).toBeNull();
    expect(next.competitiveDivisionId).toBeNull();
    expect(next.studyTrackMaterialSetId).toBeNull();
    expect(next.regionId).toBe(REGION_ID);
    expect(deriveSeasonSetupPlacement(next)).toEqual({ status: 'needsStudyTrack' });
  });

  it('recalculates ages 15–18 from the first-year answer without storing a division', () => {
    const firstYear = apply([
      { type: 'setEligibilityAge', eligibilityAge: 16 },
      { type: 'setFirstYearQuizzer', isFirstYearQuizzer: true },
    ]);
    expect(firstYear.competitiveDivisionId).toBeNull();
    expect(deriveSeasonSetupPlacement(firstYear)).toEqual({
      status: 'competitive',
      divisionId: 'intermediate',
    });

    const returning = seasonSetupWizardReducer(firstYear, {
      type: 'setFirstYearQuizzer',
      isFirstYearQuizzer: false,
    });
    expect(returning.competitiveDivisionId).toBeNull();
    expect(deriveSeasonSetupPlacement(returning)).toEqual({
      status: 'competitive',
      divisionId: 'experienced',
    });
  });

  it('stores a competitive division only when the resolver offers a choice', () => {
    const cadet = apply([
      { type: 'setEligibilityAge', eligibilityAge: 3 },
      { type: 'setCompetitiveDivision', divisionId: 'cadet' },
    ]);
    expect(cadet.competitiveDivisionId).toBe('cadet');
    expect(deriveSeasonSetupPlacement(cadet)).toEqual({
      status: 'competitive',
      divisionId: 'cadet',
    });

    const rejected = seasonSetupWizardReducer(cadet, {
      type: 'setCompetitiveDivision',
      divisionId: 'experienced',
    });
    expect(rejected.competitiveDivisionId).toBe('cadet');

    const singleOption = apply([
      { type: 'setEligibilityAge', eligibilityAge: 10 },
      { type: 'setCompetitiveDivision', divisionId: 'cadet' },
      { type: 'setFirstYearQuizzer', isFirstYearQuizzer: true },
      { type: 'setStudyTrackMaterialSet', studyTrackMaterialSetId: STUDY_TRACK_ID },
    ]);
    expect(singleOption.competitiveDivisionId).toBeNull();
    expect(singleOption.isFirstYearQuizzer).toBeNull();
    expect(singleOption.studyTrackMaterialSetId).toBeNull();
    expect(deriveSeasonSetupPlacement(singleOption)).toEqual({
      status: 'competitive',
      divisionId: 'junior',
    });
  });

  it('keeps region independent of placement', () => {
    const withRegion = apply([
      { type: 'setRegion', regionId: REGION_ID },
      { type: 'setEligibilityAge', eligibilityAge: 13 },
    ]);
    expect(withRegion.regionId).toBe(REGION_ID);
    expect(deriveSeasonSetupPlacement(withRegion)).toEqual({
      status: 'competitive',
      divisionId: 'intermediate',
    });
    expect(seasonSetupWizardReducer(withRegion, { type: 'setRegion', regionId: 'bad/id' })).toBe(
      withRegion,
    );
  });

  it('resets temporary answers when the resolved Season id changes', () => {
    const started = apply([
      { type: 'setResolvedSeason', seasonId: '2032' },
      { type: 'setEligibilityAge', eligibilityAge: 3 },
      { type: 'setCompetitiveDivision', divisionId: 'beginner' },
      { type: 'setRegion', regionId: REGION_ID },
      { type: 'submissionCompleted' },
    ]);
    const sameSeason = seasonSetupWizardReducer(started, {
      type: 'setResolvedSeason',
      seasonId: '2032',
    });
    expect(started.submission).toEqual({ status: 'complete' });
    expect(sameSeason).toBe(started);

    const nextSeason = seasonSetupWizardReducer(started, {
      type: 'setResolvedSeason',
      seasonId: '2033',
    });
    expect(nextSeason).toEqual({
      ...INITIAL_SEASON_SETUP_STATE,
      resolvedSeasonId: '2033',
    });
  });

  it('ignores submissionCompleted unless the participation request is ready', () => {
    const filledWithoutSeason = apply([
      { type: 'setEligibilityAge', eligibilityAge: 3 },
      { type: 'setCompetitiveDivision', divisionId: 'cadet' },
      { type: 'setRegion', regionId: REGION_ID },
    ]);
    expect(seasonSetupWizardReducer(filledWithoutSeason, { type: 'submissionCompleted' })).toBe(
      filledWithoutSeason,
    );

    const stale: SeasonSetupWizardState = {
      ...INITIAL_SEASON_SETUP_STATE,
      resolvedSeasonId: '2034',
      eligibilityAge: 10,
      competitiveDivisionId: 'junior',
      regionId: REGION_ID,
    };
    const refused = seasonSetupWizardReducer(stale, { type: 'submissionCompleted' });
    expect(refused).toBe(stale);
    expect(refused.competitiveDivisionId).toBe('junior');
    expect(refused.submission).toEqual({ status: 'idle' });
  });

  it('reset drops the whole temporary wizard, including season and region', () => {
    const started = apply([
      { type: 'setResolvedSeason', seasonId: '2032' },
      { type: 'setEligibilityAge', eligibilityAge: 25 },
      { type: 'setStudyTrackMaterialSet', studyTrackMaterialSetId: STUDY_TRACK_ID },
      { type: 'setRegion', regionId: REGION_ID },
    ]);
    expect(seasonSetupWizardReducer(started, { type: 'reset' })).toEqual(
      INITIAL_SEASON_SETUP_STATE,
    );
  });

  it('derives Junior and Intermediate without a stored division, and copies an opaque Study Track id', () => {
    expect(deriveSeasonSetupPlacement(apply([{ type: 'setEligibilityAge', eligibilityAge: 10 }]))).toEqual(
      { status: 'competitive', divisionId: 'junior' },
    );
    expect(deriveSeasonSetupPlacement(apply([{ type: 'setEligibilityAge', eligibilityAge: 13 }]))).toEqual(
      { status: 'competitive', divisionId: 'intermediate' },
    );
    const studyTrack = apply([
      { type: 'setEligibilityAge', eligibilityAge: 25 },
      { type: 'setStudyTrackMaterialSet', studyTrackMaterialSetId: STUDY_TRACK_ID },
    ]);
    expect(studyTrack.studyTrackMaterialSetId).toBe(STUDY_TRACK_ID);
    expect(deriveSeasonSetupPlacement(studyTrack)).toEqual({
      status: 'studyTrack',
      studyTrackMaterialSetId: STUDY_TRACK_ID,
    });
  });

  it('prefers the derived single option over a stale stored division', () => {
    const stale: SeasonSetupWizardState = {
      ...INITIAL_SEASON_SETUP_STATE,
      eligibilityAge: 10,
      competitiveDivisionId: 'cadet',
    };
    expect(deriveSeasonSetupPlacement(stale)).toEqual({
      status: 'competitive',
      divisionId: 'junior',
    });
  });
});
