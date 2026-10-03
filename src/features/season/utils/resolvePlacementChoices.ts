import { getDivisionLabel, type DivisionId } from '../domain/division';
import { resolveParticipationOptions } from '../domain/eligibility/resolveParticipationOptions';

export interface SeasonSetupPlacementChoice {
  readonly divisionId: DivisionId;
  readonly label: string;
}

export type PlacementChoicesResult =
  | { status: 'ready'; choices: readonly SeasonSetupPlacementChoice[] }
  | { status: 'unavailable' };

/**
 * Choice rows for a multi-division competitive age.
 * Labels and membership come from the resolver and getDivisionLabel.
 * A single derived division is not a choice list.
 */
export function resolvePlacementChoices(
  eligibilityAge: number | null,
): PlacementChoicesResult {
  if (typeof eligibilityAge !== 'number') {
    return { status: 'unavailable' };
  }

  const resolved = resolveParticipationOptions({ eligibilityAge });
  if (
    resolved.status !== 'eligible' ||
    resolved.participationType !== 'competitive' ||
    resolved.allowedDivisionIds.length <= 1
  ) {
    return { status: 'unavailable' };
  }

  return {
    status: 'ready',
    choices: resolved.allowedDivisionIds.map((divisionId) => ({
      divisionId,
      label: getDivisionLabel(divisionId),
    })),
  };
}
