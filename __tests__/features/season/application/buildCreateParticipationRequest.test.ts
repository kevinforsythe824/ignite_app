import { readFileSync } from 'fs';
import { resolve } from 'path';

import { buildCreateParticipationRequest } from '../../../../src/features/season/application/buildCreateParticipationRequest';
import {
  INITIAL_SEASON_SETUP_STATE,
  seasonSetupWizardReducer,
  type SeasonSetupWizardAction,
  type SeasonSetupWizardState,
} from '../../../../src/features/season/application/seasonSetupWizard';
import type { DivisionId } from '../../../../src/features/season/domain/division';

const SEASON_ID = '2034';
const REGION_ID = 'region-fixture-north';
const STUDY_TRACK_ID = 'fixture-ms-alpha';
const FORBIDDEN_KEYS = [
  'uid',
  'quizzerId',
  'dateOfBirth',
  'dob',
  'today',
  'timezone',
  'timeZone',
  'displayName',
] as const;

function wizard(partial: Partial<SeasonSetupWizardState> = {}): SeasonSetupWizardState {
  return { ...INITIAL_SEASON_SETUP_STATE, ...partial };
}

function apply(actions: readonly SeasonSetupWizardAction[]): SeasonSetupWizardState {
  return actions.reduce(seasonSetupWizardReducer, INITIAL_SEASON_SETUP_STATE);
}

function expectRequestKeys(
  request: object,
  keys: readonly string[],
  absent: readonly string[] = [],
): void {
  expect(Object.keys(request).sort()).toEqual([...keys].sort());
  for (const key of [...FORBIDDEN_KEYS, ...absent]) {
    expect(Object.prototype.hasOwnProperty.call(request, key)).toBe(false);
  }
}

describe('buildCreateParticipationRequest', () => {
  it('sends divisionId only for a real ages 2–4 choice', () => {
    const result = buildCreateParticipationRequest(
      wizard({
        resolvedSeasonId: SEASON_ID,
        eligibilityAge: 3,
        regionId: REGION_ID,
        competitiveDivisionId: 'cadet',
      }),
    );
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') {
      return;
    }
    expectRequestKeys(result.request, ['seasonId', 'eligibilityAge', 'regionId', 'divisionId'], [
      'isFirstYearQuizzer',
      'studyTrackMaterialSetId',
    ]);
    expect(result.request).toEqual({
      seasonId: SEASON_ID,
      eligibilityAge: 3,
      regionId: REGION_ID,
      divisionId: 'cadet',
    });
    expect(
      buildCreateParticipationRequest(
        wizard({
          resolvedSeasonId: SEASON_ID,
          eligibilityAge: 2,
          regionId: REGION_ID,
          competitiveDivisionId: 'beginner',
        }),
      ),
    ).toEqual({
      status: 'ready',
      request: {
        seasonId: SEASON_ID,
        eligibilityAge: 2,
        regionId: REGION_ID,
        divisionId: 'beginner',
      },
    });
    expect(
      buildCreateParticipationRequest(
        wizard({
          resolvedSeasonId: SEASON_ID,
          eligibilityAge: 4,
          regionId: REGION_ID,
          competitiveDivisionId: 'cadet',
        }),
      ),
    ).toEqual({
      status: 'ready',
      request: {
        seasonId: SEASON_ID,
        eligibilityAge: 4,
        regionId: REGION_ID,
        divisionId: 'cadet',
      },
    });
  });

  it('omits divisionId for single-option ages 5–14', () => {
    for (const eligibilityAge of [5, 8, 10, 13, 14]) {
      const result = buildCreateParticipationRequest(
        wizard({
          resolvedSeasonId: SEASON_ID,
          eligibilityAge,
          regionId: REGION_ID,
        }),
      );
      expect(result.status).toBe('ready');
      if (result.status !== 'ready') {
        return;
      }
      expectRequestKeys(result.request, ['seasonId', 'eligibilityAge', 'regionId'], [
        'divisionId',
        'isFirstYearQuizzer',
        'studyTrackMaterialSetId',
      ]);
    }
  });

  it('sends isFirstYearQuizzer for ages 15–18 and still omits divisionId', () => {
    const result = buildCreateParticipationRequest(
      wizard({
        resolvedSeasonId: SEASON_ID,
        eligibilityAge: 16,
        regionId: REGION_ID,
        isFirstYearQuizzer: true,
      }),
    );
    expect(result).toEqual({
      status: 'ready',
      request: {
        seasonId: SEASON_ID,
        eligibilityAge: 16,
        regionId: REGION_ID,
        isFirstYearQuizzer: true,
      },
    });
    if (result.status === 'ready') {
      expectRequestKeys(
        result.request,
        ['seasonId', 'eligibilityAge', 'regionId', 'isFirstYearQuizzer'],
        ['divisionId', 'studyTrackMaterialSetId'],
      );
    }

    expect(
      buildCreateParticipationRequest(
        wizard({
          resolvedSeasonId: SEASON_ID,
          eligibilityAge: 18,
          regionId: REGION_ID,
          isFirstYearQuizzer: false,
        }),
      ),
    ).toEqual({
      status: 'ready',
      request: {
        seasonId: SEASON_ID,
        eligibilityAge: 18,
        regionId: REGION_ID,
        isFirstYearQuizzer: false,
      },
    });
  });

  it('copies an opaque Study Track id and omits division and first-year', () => {
    const result = buildCreateParticipationRequest(
      wizard({
        resolvedSeasonId: SEASON_ID,
        eligibilityAge: 25,
        regionId: REGION_ID,
        studyTrackMaterialSetId: STUDY_TRACK_ID,
      }),
    );
    expect(
      buildCreateParticipationRequest(
        wizard({
          resolvedSeasonId: SEASON_ID,
          eligibilityAge: 19,
          regionId: REGION_ID,
          studyTrackMaterialSetId: STUDY_TRACK_ID,
        }),
      ),
    ).toEqual({
      status: 'ready',
      request: {
        seasonId: SEASON_ID,
        eligibilityAge: 19,
        regionId: REGION_ID,
        studyTrackMaterialSetId: STUDY_TRACK_ID,
      },
    });
    expect(result).toEqual({
      status: 'ready',
      request: {
        seasonId: SEASON_ID,
        eligibilityAge: 25,
        regionId: REGION_ID,
        studyTrackMaterialSetId: STUDY_TRACK_ID,
      },
    });
    if (result.status === 'ready') {
      expect(result.request).not.toHaveProperty('divisionId');
      expect(result.request).not.toHaveProperty('isFirstYearQuizzer');
      expectRequestKeys(
        result.request,
        ['seasonId', 'eligibilityAge', 'regionId', 'studyTrackMaterialSetId'],
        ['divisionId', 'isFirstYearQuizzer'],
      );
    }
  });

  it('fails closed on incomplete or inconsistent wizard state', () => {
    expect(buildCreateParticipationRequest(wizard({ eligibilityAge: 10, regionId: REGION_ID }))).toEqual(
      { status: 'invalid', reason: 'missingSeason' },
    );
    expect(
      buildCreateParticipationRequest(
        wizard({ resolvedSeasonId: SEASON_ID, regionId: REGION_ID }),
      ),
    ).toEqual({ status: 'invalid', reason: 'invalidEligibilityAge' });
    expect(
      buildCreateParticipationRequest(
        wizard({ resolvedSeasonId: SEASON_ID, eligibilityAge: 1, regionId: REGION_ID }),
      ),
    ).toEqual({ status: 'invalid', reason: 'invalidEligibilityAge' });
    expect(
      buildCreateParticipationRequest(
        wizard({ resolvedSeasonId: SEASON_ID, eligibilityAge: Number.NaN, regionId: REGION_ID }),
      ),
    ).toEqual({ status: 'invalid', reason: 'invalidEligibilityAge' });
    expect(
      buildCreateParticipationRequest(
        wizard({ resolvedSeasonId: SEASON_ID, eligibilityAge: 2.5, regionId: REGION_ID }),
      ),
    ).toEqual({ status: 'invalid', reason: 'invalidEligibilityAge' });
    expect(
      buildCreateParticipationRequest(
        wizard({ resolvedSeasonId: SEASON_ID, eligibilityAge: 16, regionId: REGION_ID }),
      ),
    ).toEqual({ status: 'invalid', reason: 'firstYearRequired' });
    expect(
      buildCreateParticipationRequest(
        wizard({ resolvedSeasonId: SEASON_ID, eligibilityAge: 3, regionId: REGION_ID }),
      ),
    ).toEqual({ status: 'invalid', reason: 'missingDivisionChoice' });
    expect(
      buildCreateParticipationRequest(
        wizard({
          resolvedSeasonId: SEASON_ID,
          eligibilityAge: 3,
          regionId: REGION_ID,
          competitiveDivisionId: 'junior',
        }),
      ),
    ).toEqual({ status: 'invalid', reason: 'divisionNotAllowed' });
    expect(
      buildCreateParticipationRequest(
        wizard({
          resolvedSeasonId: SEASON_ID,
          eligibilityAge: 4,
          regionId: REGION_ID,
          competitiveDivisionId: 'cadet',
          studyTrackMaterialSetId: STUDY_TRACK_ID,
        }),
      ),
    ).toEqual({ status: 'invalid', reason: 'competitiveWithStudyTrack' });
    expect(
      buildCreateParticipationRequest(
        wizard({
          resolvedSeasonId: SEASON_ID,
          eligibilityAge: 10,
          regionId: REGION_ID,
          competitiveDivisionId: 'junior',
        }),
      ),
    ).toEqual({ status: 'invalid', reason: 'stalePlacement' });
    expect(
      buildCreateParticipationRequest(
        wizard({
          resolvedSeasonId: SEASON_ID,
          eligibilityAge: 16,
          regionId: REGION_ID,
          isFirstYearQuizzer: false,
          competitiveDivisionId: 'experienced',
        }),
      ),
    ).toEqual({ status: 'invalid', reason: 'stalePlacement' });
    expect(
      buildCreateParticipationRequest(
        wizard({ resolvedSeasonId: SEASON_ID, eligibilityAge: 25, regionId: REGION_ID }),
      ),
    ).toEqual({ status: 'invalid', reason: 'missingStudyTrackMaterialSet' });
    expect(
      buildCreateParticipationRequest(
        wizard({
          resolvedSeasonId: SEASON_ID,
          eligibilityAge: 25,
          regionId: REGION_ID,
          studyTrackMaterialSetId: STUDY_TRACK_ID,
          competitiveDivisionId: 'junior' as DivisionId,
        }),
      ),
    ).toEqual({ status: 'invalid', reason: 'studyTrackWithDivision' });
    expect(
      buildCreateParticipationRequest(
        wizard({
          resolvedSeasonId: SEASON_ID,
          eligibilityAge: 10,
          regionId: '  ',
        }),
      ),
    ).toEqual({ status: 'invalid', reason: 'missingRegion' });
    expect(
      buildCreateParticipationRequest(
        wizard({
          resolvedSeasonId: SEASON_ID,
          eligibilityAge: 20,
          regionId: REGION_ID,
          studyTrackMaterialSetId: STUDY_TRACK_ID,
          isFirstYearQuizzer: false,
        }),
      ),
    ).toEqual({ status: 'invalid', reason: 'stalePlacement' });
  });

  it('follows reducer invalidation instead of keeping a stale placement', () => {
    const ageTen = apply([
      { type: 'setResolvedSeason', seasonId: SEASON_ID },
      { type: 'setEligibilityAge', eligibilityAge: 3 },
      { type: 'setCompetitiveDivision', divisionId: 'cadet' },
      { type: 'setRegion', regionId: REGION_ID },
      { type: 'setEligibilityAge', eligibilityAge: 10 },
    ]);
    const junior = buildCreateParticipationRequest(ageTen);
    expect(junior).toEqual({
      status: 'ready',
      request: { seasonId: SEASON_ID, eligibilityAge: 10, regionId: REGION_ID },
    });

    const needsFirstYear = apply([
      { type: 'setResolvedSeason', seasonId: SEASON_ID },
      { type: 'setEligibilityAge', eligibilityAge: 20 },
      { type: 'setStudyTrackMaterialSet', studyTrackMaterialSetId: STUDY_TRACK_ID },
      { type: 'setRegion', regionId: REGION_ID },
      { type: 'setEligibilityAge', eligibilityAge: 15 },
    ]);
    expect(buildCreateParticipationRequest(needsFirstYear)).toEqual({
      status: 'invalid',
      reason: 'firstYearRequired',
    });

    const needsStudyTrack = apply([
      { type: 'setResolvedSeason', seasonId: SEASON_ID },
      { type: 'setEligibilityAge', eligibilityAge: 16 },
      { type: 'setFirstYearQuizzer', isFirstYearQuizzer: true },
      { type: 'setRegion', regionId: REGION_ID },
      { type: 'setEligibilityAge', eligibilityAge: 20 },
    ]);
    expect(buildCreateParticipationRequest(needsStudyTrack)).toEqual({
      status: 'invalid',
      reason: 'missingStudyTrackMaterialSet',
    });
  });

  it('does not construct a Study Track id or attach identity, DOB, or clock fields', () => {
    const source = readFileSync(
      resolve(
        __dirname,
        '../../../../src/features/season/application/buildCreateParticipationRequest.ts',
      ),
      'utf8',
    );
    expect(source).not.toContain('2027');
    expect(source).not.toContain('beginner-');
    expect(source).not.toContain('cadet-');
    expect(source).not.toContain('dateOfBirth');
    expect(source).not.toContain('quizzerId');
    expect(source).not.toMatch(/\$\{/);
    expect(source).not.toMatch(/divisionId\s*\+/);
  });
});
