import { OFFICIAL_DIVISION_IDS, type DivisionId } from '../../../src/features/season/domain/division';
import { OFFICIAL_REGIONS } from '../../../src/features/season/domain/officialRegions';
import {
  DEV_SEASON_SELECTION_POLICY,
  RELEASE_SEASON_SELECTION_POLICY,
} from '../../../src/features/season/domain/seasonSelectionPolicy';
import type { FirestoreQuizzerSeasonParticipationDocument } from '../../../src/features/season/data/firestoreQuizzerSeasonParticipationDocument';

import { readAuthoritativeSeasonCalendarDate } from './authoritativeSeasonCalendarDate';
import {
  createQuizzerSeasonParticipation,
  type CreateQuizzerSeasonParticipationDeps,
  type ParticipationCreatePort,
  type SeasonParticipationCatalogPort,
} from './createQuizzerSeasonParticipation';
import { decideParticipationWrite } from './decideParticipationWrite';
import { ParticipationCreateError } from './participationCreateError';
import { seasonSelectionPolicyForEnvironment } from './seasonSelectionPolicyForEnvironment';
import { toParticipationHttpsError } from './toParticipationHttpsError';

const TODAY = '2032-06-01';
const SEASON_ID = '2032';
const UID = 'quizzer-1';

function currentSeason(
  status: 'draft' | 'published' | 'activeLocked' = 'published',
  overrides: Record<string, unknown> = {},
) {
  return {
    seasonId: SEASON_ID,
    name: 'Season 2032',
    startDate: '2032-04-01',
    endDate: '2032-11-30',
    igniteAvailabilityDate: '2032-03-15',
    status,
    ...overrides,
  };
}

function materialSets(seasonId = SEASON_ID) {
  return OFFICIAL_DIVISION_IDS.map((divisionId) => ({
    seasonId,
    materialSetId: `ms-${divisionId}`,
    divisionId,
    displayName: divisionId,
  }));
}

function regionDocuments(activeOverride?: { regionId: string; active: boolean }) {
  return OFFICIAL_REGIONS.map((region) => ({
    regionId: region.regionId,
    displayName: region.displayName,
    coverageAreas: [...region.coverageAreas],
    displayOrder: region.displayOrder,
    active:
      activeOverride && region.regionId === activeOverride.regionId
        ? activeOverride.active
        : region.active,
  }));
}

function memoryParticipation(initial?: unknown): ParticipationCreatePort & {
  created: FirestoreQuizzerSeasonParticipationDocument[];
  snapshot: () => unknown;
} {
  let stored = initial;
  const created: FirestoreQuizzerSeasonParticipationDocument[] = [];
  return {
    created,
    snapshot: () => stored,
    async read() {
      if (stored === undefined) {
        return { status: 'missing' };
      }
      return { status: 'present', data: stored };
    },
    async createIfMissing(userId, seasonId, document) {
      if (stored !== undefined) {
        const decision = decideParticipationWrite(true, stored, userId, seasonId, document);
        if (decision.action === 'reject-malformed') {
          return { status: 'existing-malformed' };
        }
        if (decision.action === 'return-existing') {
          return { status: 'existing', document: decision.document };
        }
      }
      stored = document;
      created.push(document);
      return { status: 'created', document };
    },
  };
}

function catalog(options?: {
  seasons?: readonly unknown[];
  materialSets?: readonly unknown[];
  regions?: readonly unknown[];
  regionSeasonIds?: string[];
  materialSeasonIds?: string[];
  fail?: boolean;
}): SeasonParticipationCatalogPort {
  return {
    async listSeasons() {
      if (options?.fail) {
        throw new Error('users/secret ECONNRESET');
      }
      return options?.seasons ?? [currentSeason()];
    },
    async listMaterialSets(seasonId) {
      options?.materialSeasonIds?.push(seasonId);
      return options?.materialSets ?? materialSets();
    },
    async listRegions(seasonId) {
      options?.regionSeasonIds?.push(seasonId);
      return options?.regions ?? regionDocuments();
    },
  };
}

function deps(
  overrides: Partial<CreateQuizzerSeasonParticipationDeps> = {},
): CreateQuizzerSeasonParticipationDeps {
  return {
    authenticatedUid: UID,
    today: TODAY,
    selectionPolicy: RELEASE_SEASON_SELECTION_POLICY,
    catalog: catalog(),
    participation: memoryParticipation(),
    ...overrides,
  };
}

function request(overrides: Record<string, unknown> = {}) {
  return {
    seasonId: SEASON_ID,
    eligibilityAge: 8,
    regionId: 'northwest',
    ...overrides,
  };
}

async function failureReason(
  data: unknown,
  overrides: Partial<CreateQuizzerSeasonParticipationDeps> = {},
): Promise<ParticipationCreateError> {
  try {
    await createQuizzerSeasonParticipation(deps(overrides), data);
  } catch (error) {
    expect(error).toBeInstanceOf(ParticipationCreateError);
    return error as ParticipationCreateError;
  }
  throw new Error('expected participation create to fail');
}

describe('createQuizzerSeasonParticipation', () => {
  it.each([
    [2, 'cadet', 'cadet'],
    [2, 'beginner', 'beginner'],
    [4, 'beginner', 'beginner'],
    [5, undefined, 'beginner'],
    [8, undefined, 'beginner'],
    [9, undefined, 'junior'],
    [11, undefined, 'junior'],
    [12, undefined, 'intermediate'],
    [14, undefined, 'intermediate'],
  ] as const)('creates competitive participation for age %s', async (age, choice, divisionId) => {
    const participation = memoryParticipation();
    const payload: Record<string, unknown> = request({ eligibilityAge: age });
    if (choice) {
      payload.divisionId = choice;
    }
    const result = await createQuizzerSeasonParticipation(deps({ participation }), payload);
    expect(result.created).toBe(true);
    expect(result.participation).toEqual({
      quizzerId: UID,
      seasonId: SEASON_ID,
      regionId: 'northwest',
      readiness: 'ready',
      participationType: 'competitive',
      divisionId,
    });
    expect(participation.created).toEqual([result.participation]);
    expect(participation.created[0]).not.toHaveProperty('eligibilityAge');
    expect(participation.created[0]).not.toHaveProperty('dateOfBirth');
    expect(participation.created[0]).not.toHaveProperty('dob');
    expect(participation.created[0]).not.toHaveProperty('isFirstYearQuizzer');
    expect(participation.created[0]).not.toHaveProperty('divisionChoice');
  });

  it.each([
    [15, true, 'intermediate'],
    [15, false, 'experienced'],
    [18, true, 'intermediate'],
    [18, false, 'experienced'],
  ] as const)(
    'derives age %s first-year %s as %s and rejects a client division',
    async (age, isFirstYearQuizzer, divisionId) => {
      const participation = memoryParticipation();
      const result = await createQuizzerSeasonParticipation(
        deps({ participation }),
        request({ eligibilityAge: age, isFirstYearQuizzer }),
      );
      expect(result.participation).toMatchObject({
        participationType: 'competitive',
        divisionId,
      });
      expect(participation.created[0]).not.toHaveProperty('isFirstYearQuizzer');

      const override = await failureReason(
        request({
          eligibilityAge: age,
          isFirstYearQuizzer,
          divisionId,
        }),
      );
      expect(override.reason).toBe('invalid-division-choice');
    },
  );

  it('creates a study track record from a current-season material set', async () => {
    const participation = memoryParticipation();
    const result = await createQuizzerSeasonParticipation(
      deps({ participation }),
      request({
        eligibilityAge: 19,
        studyTrackMaterialSetId: 'ms-experienced',
      }),
    );
    expect(result.participation).toEqual({
      quizzerId: UID,
      seasonId: SEASON_ID,
      regionId: 'northwest',
      readiness: 'ready',
      participationType: 'studyTrack',
      studyTrackMaterialSetId: 'ms-experienced',
    });
    expect(participation.created[0]).not.toHaveProperty('divisionId');
    expect(participation.created[0]).not.toHaveProperty('eligibilityAge');
    expect(participation.created[0]).not.toHaveProperty('dateOfBirth');
    expect(participation.created[0]).not.toHaveProperty('isFirstYearQuizzer');
  });

  it('rejects invalid eligibility and placement inputs', async () => {
    expect((await failureReason(request({ eligibilityAge: 2 }))).reason).toBe(
      'invalid-division-choice',
    );
    expect(
      (await failureReason(request({ eligibilityAge: 2, divisionId: 'experienced' }))).reason,
    ).toBe('invalid-division-choice');
    expect((await failureReason(request({ eligibilityAge: 1 }))).reason).toBe('eligibility-invalid');
    expect((await failureReason(request({ eligibilityAge: 16 }))).reason).toBe(
      'eligibility-invalid',
    );
    expect(
      (await failureReason(request({ eligibilityAge: 10, isFirstYearQuizzer: true }))).reason,
    ).toBe('eligibility-invalid');
    expect(
      (
        await failureReason(
          request({ eligibilityAge: 15, isFirstYearQuizzer: false, divisionId: 'intermediate' }),
        )
      ).reason,
    ).toBe('invalid-division-choice');
    expect(
      (
        await failureReason(
          request({ eligibilityAge: 15, isFirstYearQuizzer: true, divisionId: 'experienced' }),
        )
      ).reason,
    ).toBe('invalid-division-choice');
    expect(
      (
        await failureReason(
          request({
            eligibilityAge: 8,
            studyTrackMaterialSetId: 'ms-beginner',
          }),
        )
      ).reason,
    ).toBe('invalid-study-track-material-set');
    expect(
      (
        await failureReason(
          request({
            eligibilityAge: 19,
            divisionId: 'experienced',
            studyTrackMaterialSetId: 'ms-experienced',
          }),
        )
      ).reason,
    ).toBe('invalid-division-choice');
    expect(
      (await failureReason(request({ eligibilityAge: 19, studyTrackMaterialSetId: 'missing' })))
        .reason,
    ).toBe('invalid-study-track-material-set');
    expect((await failureReason(request({ eligibilityAge: 8, divisionId: 'beginner' }))).reason).toBe(
      'invalid-division-choice',
    );
  });

  it('rejects unauthenticated and malformed requests without using a client date or uid', async () => {
    const seasons = jest.fn(async () => [currentSeason()]);
    const unauthenticated = await failureReason(request(), {
      authenticatedUid: null,
      catalog: { ...catalog(), listSeasons: seasons },
    });
    expect(unauthenticated.reason).toBe('unauthenticated');
    expect(seasons).not.toHaveBeenCalled();

    expect((await failureReason(null)).reason).toBe('malformed-input');
    expect((await failureReason({ seasonId: ' ' })).reason).toBe('malformed-input');
    const clientDate = await failureReason(request({ today: '1999-01-01', uid: 'other-user' }));
    expect(clientDate.reason).toBe('malformed-input');
    expect(clientDate.clientMessage).not.toContain('1999');
  });

  it('rejects season configuration that is not one current season', async () => {
    expect(
      (await failureReason(request(), { catalog: catalog({ seasons: [] }) })).reason,
    ).toBe('no-current-season');

    const overlapping = [
      currentSeason(),
      {
        ...currentSeason(),
        seasonId: '2033',
        name: 'Season 2033',
      },
    ];
    expect(
      (await failureReason(request(), { catalog: catalog({ seasons: overlapping }) })).reason,
    ).toBe('season-ambiguous');

    const malformed = [currentSeason(), { ...currentSeason(), seasonId: '2034', name: ' ' }];
    expect(
      (await failureReason(request(), { catalog: catalog({ seasons: malformed }) })).reason,
    ).toBe('season-config-invalid');

    const regionSeasonIds: string[] = [];
    const wrongSeason = await failureReason(request({ seasonId: '2026' }), {
      catalog: catalog({ regionSeasonIds }),
    });
    expect(wrongSeason.reason).toBe('wrong-season');
    expect(regionSeasonIds).toEqual([]);
  });

  it('accepts a date-valid draft only under the DEV policy', async () => {
    const draftCatalog = catalog({ seasons: [currentSeason('draft')] });
    const dev = await createQuizzerSeasonParticipation(
      deps({
        selectionPolicy: seasonSelectionPolicyForEnvironment('dev'),
        catalog: draftCatalog,
      }),
      request(),
    );
    expect(dev.created).toBe(true);
    expect(dev.participation).toMatchObject({
      participationType: 'competitive',
      divisionId: 'beginner',
    });

    expect(seasonSelectionPolicyForEnvironment('dev')).toBe(DEV_SEASON_SELECTION_POLICY);
    const staging = await failureReason(request(), {
      selectionPolicy: seasonSelectionPolicyForEnvironment('staging'),
      catalog: catalog({ seasons: [currentSeason('draft')] }),
    });
    const prod = await failureReason(request(), {
      selectionPolicy: seasonSelectionPolicyForEnvironment('prod'),
      catalog: catalog({ seasons: [currentSeason('draft')] }),
    });
    expect(staging.reason).toBe('no-current-season');
    expect(prod.reason).toBe('no-current-season');
    expect(seasonSelectionPolicyForEnvironment('staging')).toBe(RELEASE_SEASON_SELECTION_POLICY);
    expect(seasonSelectionPolicyForEnvironment('prod')).toBe(RELEASE_SEASON_SELECTION_POLICY);
  });

  it('rejects a DEV draft before availability and after end', async () => {
    const future = await failureReason(request(), {
      selectionPolicy: DEV_SEASON_SELECTION_POLICY,
      catalog: catalog({
        seasons: [currentSeason('draft', { igniteAvailabilityDate: '2032-07-01' })],
      }),
    });
    const ended = await failureReason(request(), {
      selectionPolicy: DEV_SEASON_SELECTION_POLICY,
      catalog: catalog({
        seasons: [currentSeason('draft', { endDate: '2032-05-31' })],
      }),
    });
    expect(future.reason).toBe('no-current-season');
    expect(ended.reason).toBe('no-current-season');
  });

  it('rejects invalid, inactive, malformed, and incomplete region configuration', async () => {
    expect((await failureReason(request({ regionId: 'dev-test-region' }))).reason).toBe(
      'invalid-region',
    );
    expect(
      (
        await failureReason(request(), {
          catalog: catalog({
            regions: regionDocuments({ regionId: 'northwest', active: false }),
          }),
        })
      ).reason,
    ).toBe('invalid-region');

    const malformedRegions = regionDocuments().map((region, index) =>
      index === 0 ? { ...region, contact: 'nope' } : region,
    );
    expect(
      (await failureReason(request(), { catalog: catalog({ regions: malformedRegions }) })).reason,
    ).toBe('region-config-invalid');

    const incomplete = regionDocuments().filter((region) => region.regionId !== 'southeast');
    expect(
      (await failureReason(request(), { catalog: catalog({ regions: incomplete }) })).reason,
    ).toBe('region-config-invalid');

    const regionSeasonIds: string[] = [];
    await createQuizzerSeasonParticipation(
      deps({ catalog: catalog({ regionSeasonIds }) }),
      request(),
    );
    expect(regionSeasonIds).toEqual([SEASON_ID]);
  });

  it('does not accept a material set from another season or an ambiguous set', async () => {
    const crossSeason = await failureReason(request(), {
      catalog: catalog({ materialSets: materialSets('2026') }),
    });
    expect(crossSeason.reason).toBe('material-set-config-invalid');
    expect(crossSeason.clientMessage).not.toContain('beginner-2032');

    const duplicate = [
      ...materialSets(),
      {
        seasonId: SEASON_ID,
        materialSetId: 'ms-beginner-copy',
        divisionId: 'beginner' as DivisionId,
        displayName: 'Beginner copy',
      },
    ];
    expect(
      (await failureReason(request(), { catalog: catalog({ materialSets: duplicate }) })).reason,
    ).toBe('material-set-config-invalid');

    const studyCross = await failureReason(
      request({ eligibilityAge: 19, studyTrackMaterialSetId: 'ms-experienced' }),
      { catalog: catalog({ materialSets: materialSets('2026') }) },
    );
    expect(studyCross.reason).toBe('invalid-study-track-material-set');
  });

  it('returns an existing record and does not overwrite a conflicting or malformed one', async () => {
    const participation = memoryParticipation();
    const first = await createQuizzerSeasonParticipation(deps({ participation }), request());
    const second = await createQuizzerSeasonParticipation(
      deps({ participation }),
      request({ eligibilityAge: 2, divisionId: 'cadet', regionId: 'southwest' }),
    );
    expect(second.created).toBe(false);
    expect(second.participation).toEqual(first.participation);
    expect(participation.created).toHaveLength(1);
    expect(participation.snapshot()).toEqual(first.participation);

    const malformed = memoryParticipation({
      quizzerId: UID,
      seasonId: SEASON_ID,
      regionId: 'northwest',
      readiness: 'incomplete',
      participationType: 'competitive',
      divisionId: 'beginner',
    });
    const broken = await failureReason(request({ regionId: 'southwest' }), {
      participation: malformed,
    });
    expect(broken.reason).toBe('existing-participation-invalid');
    expect(malformed.created).toHaveLength(0);
    expect(malformed.snapshot()).toMatchObject({ readiness: 'incomplete' });
  });

  it('hides persistence failures and does not echo raw errors', async () => {
    const error = await failureReason(request(), {
      catalog: catalog({ fail: true }),
    });
    expect(error.reason).toBe('persistence-failure');
    expect(error.clientMessage).toBe('Participation could not be saved.');
    expect(error.clientMessage).not.toContain('ECONNRESET');
    expect(error.clientMessage).not.toContain('users/');

    const httpsError = toParticipationHttpsError(new Error('users/quizzer-1/seasons/2032 boom'));
    expect(httpsError.code).toBe('internal');
    expect(httpsError.message).not.toContain('users/');
    expect(httpsError.message).not.toContain('boom');
  });
});

describe('season selection policy composition', () => {
  it('maps DEV to the draft policy and STAGING/PROD to release', () => {
    expect(seasonSelectionPolicyForEnvironment('dev')).toBe(DEV_SEASON_SELECTION_POLICY);
    expect(seasonSelectionPolicyForEnvironment('staging')).toBe(RELEASE_SEASON_SELECTION_POLICY);
    expect(seasonSelectionPolicyForEnvironment('prod')).toBe(RELEASE_SEASON_SELECTION_POLICY);
    expect(DEV_SEASON_SELECTION_POLICY.permittedStatuses).toContain('draft');
    expect(RELEASE_SEASON_SELECTION_POLICY.permittedStatuses).not.toContain('draft');
  });

  it('fails closed for an unknown environment', () => {
    expect(() => seasonSelectionPolicyForEnvironment('qa')).toThrow(ParticipationCreateError);
    try {
      seasonSelectionPolicyForEnvironment('');
    } catch (error) {
      expect(error).toBeInstanceOf(ParticipationCreateError);
      expect((error as ParticipationCreateError).reason).toBe('unknown-environment');
    }
  });

  it('does not put the environment mapping inside resolveCurrentSeason', () => {
    const { readFileSync } = require('fs') as typeof import('fs');
    const { resolve } = require('path') as typeof import('path');
    const resolver = readFileSync(
      resolve(__dirname, '../../../src/features/season/domain/resolveCurrentSeason.ts'),
      'utf8',
    );
    const useCase = readFileSync(resolve(__dirname, 'createQuizzerSeasonParticipation.ts'), 'utf8');
    expect(resolver).not.toContain('IGNITE_ENV');
    expect(resolver).not.toContain('Date.now');
    expect(resolver).not.toContain('process.env');
    expect(resolver).not.toContain('DEV_SEASON_SELECTION_POLICY');
    expect(useCase).toContain('resolveParticipationOptions');
    expect(useCase).not.toContain('Date.now');
    expect(useCase).not.toMatch(/eligibilityAge\s*>=/);
    expect(useCase).not.toContain('DEV_SEASON_SELECTION_POLICY');
  });
});

describe('authoritative season calendar date', () => {
  it('fails closed instead of guessing a timezone', () => {
    expect(() => readAuthoritativeSeasonCalendarDate()).toThrow(ParticipationCreateError);
    try {
      readAuthoritativeSeasonCalendarDate();
    } catch (error) {
      expect((error as ParticipationCreateError).reason).toBe('calendar-unconfigured');
      expect((error as ParticipationCreateError).clientMessage).not.toContain('UTC');
    }
  });
});
