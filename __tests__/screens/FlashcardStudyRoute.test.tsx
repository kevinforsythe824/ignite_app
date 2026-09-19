import { TEST_MATERIAL_SET_ID, TEST_SEASON_ID } from '../../src/features/flashcards/domain/testSeason';
import { firestoreCurriculumRepository } from '../../src/features/flashcards/repositories';
import { jsonCurriculumRepository } from '../../src/features/flashcards/repositories/jsonCurriculumRepository';
import { studyCurriculumRepository } from '../../src/features/flashcards/screens/FlashcardStudyRoute';

describe('FlashcardStudyRoute composition', () => {
  it('uses FirestoreCurriculumRepository for test-season, not JSON', () => {
    expect(studyCurriculumRepository).toBe(firestoreCurriculumRepository);
    expect(studyCurriculumRepository).not.toBe(jsonCurriculumRepository);
    expect(studyCurriculumRepository.constructor.name).toBe('FirestoreCurriculumRepository');
    expect(TEST_SEASON_ID).toBe('test-season');
    expect(TEST_MATERIAL_SET_ID).toBe('test-material-set');
  });
});
