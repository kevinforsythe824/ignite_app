import type { CurriculumRepository } from '../src/features/flashcards/repositories/curriculumRepository';
import { jsonCurriculumRepository } from '../src/features/flashcards/repositories/jsonCurriculumRepository';
import {
  TEMPORARY_STUDY_MATERIAL_SET_ID,
  TEMPORARY_STUDY_SEASON_ID,
  TEST_MATERIAL_SET_ID,
  TEST_SEASON_ID,
} from '../src/features/flashcards/domain/testSeason';

/**
 * Shell-test double. Renders the JSON fixture under the temporary Study
 * target so navigation tests do not need Firestore.
 */
export const temporaryStudyFixtureRepository: CurriculumRepository = {
  async getCurriculum(seasonId, materialSetId) {
    if (
      seasonId !== TEMPORARY_STUDY_SEASON_ID ||
      materialSetId !== TEMPORARY_STUDY_MATERIAL_SET_ID
    ) {
      return jsonCurriculumRepository.getCurriculum(seasonId, materialSetId);
    }

    const curriculum = await jsonCurriculumRepository.getCurriculum(
      TEST_SEASON_ID,
      TEST_MATERIAL_SET_ID,
    );
    return {
      ...curriculum,
      seasonId,
      materialSetId,
      cards: curriculum.cards.map((card) => ({
        ...card,
        seasonId,
        materialSetId,
      })),
    };
  },
};
