import mockVerseData from '../../../data/mock-verse-data.json';
import type { FixtureCardRecord } from '../data/fixtureCardRecord';
import { mapFixturesToCards } from '../data/mapFixtureToCard';
import { TEST_SEASON_ID } from '../domain/testSeason';
import {
  UnknownSeasonError,
  type CurriculumRepository,
  type StudyCurriculum,
} from './curriculumRepository';

const TEST_CURRICULUM_TITLE = 'Luke 2:1-9';

/** Loads the bundled mock curriculum through the Stage 1 Card mapper. */
export class JsonCurriculumRepository implements CurriculumRepository {
  getCurriculum(seasonId: string): Promise<StudyCurriculum> {
    if (seasonId !== TEST_SEASON_ID) {
      return Promise.reject(new UnknownSeasonError(seasonId));
    }

    const cards = mapFixturesToCards(mockVerseData as FixtureCardRecord[], seasonId);
    return Promise.resolve({
      seasonId,
      title: TEST_CURRICULUM_TITLE,
      cards,
    });
  }
}

export const jsonCurriculumRepository = new JsonCurriculumRepository();
