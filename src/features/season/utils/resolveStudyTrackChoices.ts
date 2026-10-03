import { isSeasonSetupOpaqueId } from '../application/seasonSetupOpaqueId';
import { getDivisionLabel, isDivisionId, type DivisionId } from '../domain/division';
import { resolveParticipationOptions } from '../domain/eligibility/resolveParticipationOptions';

/**
 * Injected Study Track catalog row.
 * Phase 3C.3 supplies these from the season MaterialSet catalog.
 * This module does not invent ids or read Firestore.
 */
export interface SeasonSetupStudyTrackOption {
  readonly materialSetId: string;
  readonly divisionId: string;
}

export interface SeasonSetupStudyTrackChoice {
  readonly materialSetId: string;
  readonly divisionId: DivisionId;
  readonly label: string;
}

export type StudyTrackChoicesResult =
  | { status: 'ready'; choices: readonly SeasonSetupStudyTrackChoice[] }
  | { status: 'unavailable' };

function unavailable(): StudyTrackChoicesResult {
  return { status: 'unavailable' };
}

/**
 * View model for Study Track.
 * Shows only divisions resolveParticipationOptions allows, labeled by getDivisionLabel.
 * Stored value is the injected opaque materialSetId.
 * Missing, duplicate, or malformed catalogs fail closed.
 */
export function resolveStudyTrackChoices(
  eligibilityAge: number | null,
  options: readonly SeasonSetupStudyTrackOption[] | null | undefined,
): StudyTrackChoicesResult {
  if (typeof eligibilityAge !== 'number' || options == null) {
    return unavailable();
  }

  const resolved = resolveParticipationOptions({ eligibilityAge });
  if (resolved.status !== 'eligible' || resolved.participationType !== 'studyTrack') {
    return unavailable();
  }

  if (options.length !== resolved.allowedDivisionIds.length) {
    return unavailable();
  }

  const materialSetIdByDivision = new Map<DivisionId, string>();
  const seenMaterialSetIds = new Set<string>();

  for (const option of options) {
    if (option === null || typeof option !== 'object') {
      return unavailable();
    }
    if (!isDivisionId(option.divisionId) || !resolved.allowedDivisionIds.includes(option.divisionId)) {
      return unavailable();
    }
    if (!isSeasonSetupOpaqueId(option.materialSetId)) {
      return unavailable();
    }
    if (materialSetIdByDivision.has(option.divisionId) || seenMaterialSetIds.has(option.materialSetId)) {
      return unavailable();
    }
    materialSetIdByDivision.set(option.divisionId, option.materialSetId);
    seenMaterialSetIds.add(option.materialSetId);
  }

  const choices: SeasonSetupStudyTrackChoice[] = [];
  for (const divisionId of resolved.allowedDivisionIds) {
    const materialSetId = materialSetIdByDivision.get(divisionId);
    if (materialSetId === undefined) {
      return unavailable();
    }
    choices.push({
      materialSetId,
      divisionId,
      label: getDivisionLabel(divisionId),
    });
  }

  return { status: 'ready', choices };
}
