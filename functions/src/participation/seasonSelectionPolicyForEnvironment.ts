import {
  selectSeasonSelectionPolicy,
  type SeasonSelectionPolicy,
} from '../../../src/features/season/domain/seasonSelectionPolicy';

import { ParticipationCreateError } from './participationCreateError';

/**
 * Composition-root mapping from Ignite environment to a season selection policy.
 * The status lists and the pure mapping live in the Season domain.
 * This wrapper translates an unknown environment into ParticipationCreateError.
 * resolveCurrentSeason does not read the environment.
 * Unknown values fail closed. There is no dev default.
 */
export function seasonSelectionPolicyForEnvironment(
  environment: string,
): SeasonSelectionPolicy {
  const selected = selectSeasonSelectionPolicy(environment);
  if (selected.status === 'invalid') {
    throw new ParticipationCreateError('unknown-environment');
  }
  return selected.policy;
}
