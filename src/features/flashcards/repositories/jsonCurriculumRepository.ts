import mockVerseData from '../../../data/mock-verse-data.json';
import type { FixtureCardRecord } from '../data/fixtureCardRecord';
import { mapFixturesToCards } from '../data/mapFixtureToCard';
import { TEST_MATERIAL_SET_ID, TEST_SEASON_ID } from '../domain/testSeason';
import {
  UnknownMaterialSetError,
  UnknownSeasonError,
  type CurriculumRepository,
  type StudyCurriculum,
} from './curriculumRepository';

const TEST_CURRICULUM_TITLE = 'Luke 2:1-9';

/** Loads the bundled mock curriculum through the Card mapper as one DEV MaterialSet. */
export class JsonCurriculumRepository implements CurriculumRepository {
  getCurriculum(seasonId: string, materialSetId: string): Promise<StudyCurriculum> {
    if (seasonId !== TEST_SEASON_ID) {
      return Promise.reject(new UnknownSeasonError(seasonId));
    }
    if (materialSetId !== TEST_MATERIAL_SET_ID) {
      return Promise.reject(new UnknownMaterialSetError(seasonId, materialSetId));
    }

    const cards = mapFixturesToCards(
      mockVerseData as FixtureCardRecord[],
      seasonId,
      materialSetId,
    );
    return Promise.resolve({
      seasonId,
      materialSetId,
      title: TEST_CURRICULUM_TITLE,
      cards,
      sections: [],
    });
  }
}

export const jsonCurriculumRepository = new JsonCurriculumRepository();
