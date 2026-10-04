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
 * Fixture ids retained for tests. Production Study reads
 * SeasonParticipationSession.studyTarget and does not use these constants.
 */
export const TEMPORARY_STUDY_SEASON_ID = '2027';

/** Fixture MaterialSet paired with TEMPORARY_STUDY_SEASON_ID. */
export const TEMPORARY_STUDY_MATERIAL_SET_ID = 'beginner-2027';
