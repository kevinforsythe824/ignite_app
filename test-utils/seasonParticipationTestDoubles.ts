import type { DivisionId } from '../src/features/season/domain/division';
import type { MaterialSet } from '../src/features/season/domain/materialSet';
import type { ReadyQuizzerSeasonParticipation } from '../src/features/season/domain/readyParticipationRecord';
import type { Season } from '../src/features/season/domain/season';
import type { SeasonMaterialSetCatalogRepository } from '../src/features/season/repositories/seasonMaterialSetCatalogRepository';
import type { SeasonCatalogRepository } from '../src/features/season/repositories/seasonCatalogRepository';
import type { QuizzerSeasonParticipationRepository } from '../src/features/season/repositories/quizzerSeasonParticipationRepository';

/** Fixed instant whose America/Chicago calendar date is 2032-06-15. */
export const SEASON_PARTICIPATION_TEST_INSTANT = new Date('2032-06-15T18:00:00.000Z');

export const SEASON_PARTICIPATION_TEST_CALENDAR_DATE = '2032-06-15';

/** Fixture Season id. Four digits so Season Setup can ask the January 1 question. */
export const SEASON_PARTICIPATION_TEST_SEASON_ID = '2032';

export const SEASON_PARTICIPATION_TEST_MATERIAL_SET_ID = 'material-junior';

export function testSeason(overrides: Partial<Season> = {}): Season {
  return {
    seasonId: SEASON_PARTICIPATION_TEST_SEASON_ID,
    name: 'Current Season',
    startDate: '2031-09-01',
    endDate: '2032-07-31',
    status: 'published',
    igniteAvailabilityDate: '2031-09-01',
    ...overrides,
  };
}

export function testCompetitiveParticipation(
  quizzerId: string,
  seasonId = SEASON_PARTICIPATION_TEST_SEASON_ID,
  divisionId: DivisionId = 'junior',
): ReadyQuizzerSeasonParticipation {
  return {
    quizzerId,
    seasonId,
    regionId: 'northwest',
    readiness: 'ready',
    participationType: 'competitive',
    divisionId,
  };
}

export function testStudyTrackParticipation(
  quizzerId: string,
  seasonId: string,
  studyTrackMaterialSetId: string,
): ReadyQuizzerSeasonParticipation {
  return {
    quizzerId,
    seasonId,
    regionId: 'northwest',
    readiness: 'ready',
    participationType: 'studyTrack',
    studyTrackMaterialSetId,
  };
}

export function testMaterialSet(
  seasonId: string,
  materialSetId: string,
  divisionId: DivisionId,
  displayName: string = divisionId,
): MaterialSet {
  return {
    seasonId,
    materialSetId,
    divisionId,
    displayName,
  };
}

export interface SeasonParticipationTestDoubles {
  clock: jest.Mock<Date, []>;
  readEnvironment: jest.Mock<string, []>;
  seasonCatalog: SeasonCatalogRepository & { listSeasons: jest.Mock };
  participationRepository: QuizzerSeasonParticipationRepository & {
    getParticipation: jest.Mock;
  };
  materialSetCatalog: SeasonMaterialSetCatalogRepository & { listMaterialSets: jest.Mock };
}

/** Date-valid published Season, participation for that Season, and one Junior MaterialSet. */
export function createSeasonParticipationTestDoubles(): SeasonParticipationTestDoubles {
  const season = testSeason();
  const clock = jest.fn(() => SEASON_PARTICIPATION_TEST_INSTANT);
  const readEnvironment = jest.fn(() => 'dev');
  const seasonCatalog = {
    listSeasons: jest.fn(async () => [season]),
  };
  const participationRepository = {
    getParticipation: jest.fn(async (userId: string, seasonId: string) => {
      if (seasonId !== season.seasonId) {
        return null;
      }
      return testCompetitiveParticipation(userId, seasonId);
    }),
  };
  const materialSetCatalog = {
    listMaterialSets: jest.fn(async (seasonId: string) => [
      testMaterialSet(seasonId, SEASON_PARTICIPATION_TEST_MATERIAL_SET_ID, 'junior', 'Junior'),
    ]),
  };

  return {
    clock,
    readEnvironment,
    seasonCatalog,
    participationRepository,
    materialSetCatalog,
  };
}
