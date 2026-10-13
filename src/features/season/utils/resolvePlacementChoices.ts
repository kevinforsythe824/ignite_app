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
 * Pass a first-year answer when the wizard has one. Age-only calls stay
 * correct for bands that do not require that answer.
 * A single derived division is not a choice list.
 */
export function resolvePlacementChoices(
  eligibilityAge: number | null,
  isFirstYearQuizzer?: boolean | null,
): PlacementChoicesResult {
  if (typeof eligibilityAge !== 'number') {
    return { status: 'unavailable' };
  }

  const resolved = resolveParticipationOptions(
    typeof isFirstYearQuizzer === 'boolean'
      ? { eligibilityAge, isFirstYearQuizzer }
      : { eligibilityAge },
  );
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
