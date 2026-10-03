import type { SeasonStatus } from './season';

/**
 * Statuses a caller may treat as selectable for the current Season.
 * The current-Season resolver evaluates only the policy it is given.
 * `isSeasonSelectable` stays the release-safe allowlist and is not used here.
 * `committeeValidated` and `archived` are not on either built-in policy.
 * Archived is also rejected by the resolver even if a caller adds it.
 */
export interface SeasonSelectionPolicy {
  readonly permittedStatuses: readonly SeasonStatus[];
}

const DEV_PERMITTED_STATUSES: readonly SeasonStatus[] = Object.freeze([
  'draft',
  'published',
  'activeLocked',
]);

const RELEASE_PERMITTED_STATUSES: readonly SeasonStatus[] = Object.freeze([
  'published',
  'activeLocked',
]);

/** Local/DEV composition may select a date-valid draft Season. */
export const DEV_SEASON_SELECTION_POLICY: SeasonSelectionPolicy = Object.freeze({
  permittedStatuses: DEV_PERMITTED_STATUSES,
});

/** STAGING/PROD composition may not select draft. */
export const RELEASE_SEASON_SELECTION_POLICY: SeasonSelectionPolicy = Object.freeze({
  permittedStatuses: RELEASE_PERMITTED_STATUSES,
});

export type SelectSeasonSelectionPolicyResult =
  | { status: 'selected'; policy: SeasonSelectionPolicy }
  | { status: 'invalid'; reason: 'unknownEnvironment' };

/**
 * Environment → selection policy.
 * Status lists stay on the constants above. Unknown environments fail closed.
 * This function does not throw Functions errors and does not read the process environment.
 */
export function selectSeasonSelectionPolicy(
  environment: string,
): SelectSeasonSelectionPolicyResult {
  if (environment === 'dev') {
    return { status: 'selected', policy: DEV_SEASON_SELECTION_POLICY };
  }
  if (environment === 'staging' || environment === 'prod') {
    return { status: 'selected', policy: RELEASE_SEASON_SELECTION_POLICY };
  }
  return { status: 'invalid', reason: 'unknownEnvironment' };
}
