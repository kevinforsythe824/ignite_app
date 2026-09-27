import type { DivisionId } from '../../season/domain/division';

/**
 * Season id for the bundled mock curriculum.
 * Not a real Season lifecycle value — Sprint 3 owns that model.
 */
export const TEST_SEASON_ID = 'test-season';

/**
 * DEV MaterialSet stamped onto the bundled mock curriculum.
 * Linked 1:1 to a Division; nested Firestore paths are Phase 2.
 */
export const TEST_MATERIAL_SET_ID = 'test-material-set';

/** Official division this DEV MaterialSet serves. */
export const TEST_MATERIAL_SET_DIVISION_ID: DivisionId = 'beginner';

/**
 * Temporary Study target until Phase 3 participation replaces the
 * FlashcardStudyRoute call site. Not a Season lifecycle or eligibility rule.
 */
export const TEMPORARY_STUDY_SEASON_ID = '2027';

/** Temporary MaterialSet paired with TEMPORARY_STUDY_SEASON_ID. */
export const TEMPORARY_STUDY_MATERIAL_SET_ID = 'beginner-2027';
