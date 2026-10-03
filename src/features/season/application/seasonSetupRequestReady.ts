import { buildCreateParticipationRequest } from './buildCreateParticipationRequest';
import type { SeasonSetupWizardState } from './seasonSetupWizard';

/**
 * Single readiness rule for Review and Complete.
 * Reuses the participation-request builder; it does not restate eligibility.
 */
export function isSeasonSetupRequestReady(state: SeasonSetupWizardState): boolean {
  return buildCreateParticipationRequest(state).status === 'ready';
}
