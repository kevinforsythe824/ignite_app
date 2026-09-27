import { readFileSync } from 'fs';
import { join } from 'path';

import {
  TEMPORARY_STUDY_MATERIAL_SET_ID,
  TEMPORARY_STUDY_SEASON_ID,
  TEST_MATERIAL_SET_ID,
  TEST_SEASON_ID,
} from '../../src/features/flashcards/domain/testSeason';
import { firestoreCurriculumRepository } from '../../src/features/flashcards/repositories';
import { jsonCurriculumRepository } from '../../src/features/flashcards/repositories/jsonCurriculumRepository';
import { studyCurriculumRepository } from '../../src/features/flashcards/screens/FlashcardStudyRoute';

describe('FlashcardStudyRoute composition', () => {
  it('binds Firestore curriculum to the temporary Study target', () => {
    expect(studyCurriculumRepository).toBe(firestoreCurriculumRepository);
    expect(studyCurriculumRepository).not.toBe(jsonCurriculumRepository);
    expect(studyCurriculumRepository.constructor.name).toBe('FirestoreCurriculumRepository');
    expect(TEST_SEASON_ID).toBe('test-season');
    expect(TEST_MATERIAL_SET_ID).toBe('test-material-set');
    expect(TEMPORARY_STUDY_SEASON_ID).toBe('2027');
    expect(TEMPORARY_STUDY_MATERIAL_SET_ID).toBe('beginner-2027');

    const source = readFileSync(
      join(__dirname, '../../src/features/flashcards/screens/FlashcardStudyRoute.tsx'),
      'utf8',
    );
    expect(source).toContain('TEMPORARY_STUDY_SEASON_ID');
    expect(source).toContain('TEMPORARY_STUDY_MATERIAL_SET_ID');
    expect(source).not.toContain('TEST_SEASON_ID');
    expect(source).not.toContain("'2027'");
    expect(source).not.toContain("'beginner-2027'");
  });
});
