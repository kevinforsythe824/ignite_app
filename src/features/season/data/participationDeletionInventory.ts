import { PARTICIPATION_PATH_PATTERN } from './firestoreQuizzerSeasonParticipationDocument';

/**
 * Account-deletion inventory for season participation.
 * This is a target list for a future deleter. It does not delete anything.
 */
export const QUIZZER_SEASON_PARTICIPATION_DELETION_TARGET = {
  pathPattern: PARTICIPATION_PATH_PATTERN,
  classification: 'DELETE_WITH_ACCOUNT',
  clientDelete: 'denied',
} as const;

export const OFFICIAL_REGION_CONFIGURATION_RETENTION = {
  pathPattern: 'seasons/{seasonId}/regions/{regionId}',
  classification: 'NOT_ACCOUNT_OWNED',
} as const;
