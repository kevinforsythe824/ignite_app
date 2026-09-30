import {
  DEV_SEASON_SELECTION_POLICY,
  RELEASE_SEASON_SELECTION_POLICY,
  type SeasonSelectionPolicy,
} from '../../../src/features/season/domain/seasonSelectionPolicy';

import { ParticipationCreateError } from './participationCreateError';

/**
 * Composition-root mapping from Ignite environment to a season selection policy.
 * resolveCurrentSeason does not read the environment.
 * Unknown values fail closed. There is no dev default.
 */
export function seasonSelectionPolicyForEnvironment(
  environment: string,
): SeasonSelectionPolicy {
  if (environment === 'dev') {
    return DEV_SEASON_SELECTION_POLICY;
  }
  if (environment === 'staging' || environment === 'prod') {
    return RELEASE_SEASON_SELECTION_POLICY;
  }
  throw new ParticipationCreateError('unknown-environment');
}
