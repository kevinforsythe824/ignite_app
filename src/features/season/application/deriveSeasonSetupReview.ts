import { getDivisionLabel } from '../domain/division';
import { findActiveRegionById, type OfficialRegionConfig } from '../domain/region';
import { resolveSeasonYear } from '../domain/seasonYear';
import type { StudyTrackChoicesResult } from '../utils/resolveStudyTrackChoices';

import { buildCreateParticipationRequest } from './buildCreateParticipationRequest';
import { deriveSeasonSetupPlacement } from './seasonSetupWizard';
import type { SeasonSetupWizardState } from './seasonSetupWizard';

export type SeasonSetupReviewModel =
  | {
      status: 'ready';
      seasonLabel: string;
      materialKind: 'division' | 'studyTrack';
      materialLabel: string;
      regionName: string;
    }
  | { status: 'unavailable' };

function unavailable(): SeasonSetupReviewModel {
  return { status: 'unavailable' };
}

function seasonLabelFor(seasonId: string | null): string | null {
  if (seasonId === null) {
    return null;
  }
  const year = resolveSeasonYear(seasonId);
  if (year.status !== 'year') {
    return null;
  }
  return `${year.year} Season`;
}

/**
 * Review summary from the participation request and the loaded catalog.
 * Ready means buildCreateParticipationRequest is ready and the stored
 * Region and Study Track selection still exist in that catalog.
 */
export function deriveSeasonSetupReview(
  wizard: SeasonSetupWizardState,
  regions: readonly OfficialRegionConfig[] | null,
  studyTrackChoices: StudyTrackChoicesResult,
): SeasonSetupReviewModel {
  const built = buildCreateParticipationRequest(wizard);
  if (built.status !== 'ready') {
    return unavailable();
  }

  const seasonLabel = seasonLabelFor(wizard.resolvedSeasonId);
  if (seasonLabel === null || wizard.regionId === null || regions === null) {
    return unavailable();
  }

  const region = findActiveRegionById(regions, wizard.regionId);
  if (!region) {
    return unavailable();
  }

  const placement = deriveSeasonSetupPlacement(wizard);
  if (placement.status === 'competitive') {
    if ('studyTrackMaterialSetId' in built.request) {
      return unavailable();
    }
    return {
      status: 'ready',
      seasonLabel,
      materialKind: 'division',
      materialLabel: getDivisionLabel(placement.divisionId),
      regionName: region.displayName,
    };
  }

  if (placement.status !== 'studyTrack') {
    return unavailable();
  }
  if (
    !('studyTrackMaterialSetId' in built.request) ||
    built.request.studyTrackMaterialSetId !== placement.studyTrackMaterialSetId
  ) {
    return unavailable();
  }
  if (studyTrackChoices.status !== 'ready') {
    return unavailable();
  }
  const choice = studyTrackChoices.choices.find(
    (item) => item.materialSetId === placement.studyTrackMaterialSetId,
  );
  if (!choice) {
    return unavailable();
  }

  return {
    status: 'ready',
    seasonLabel,
    materialKind: 'studyTrack',
    materialLabel: choice.label,
    regionName: region.displayName,
  };
}
