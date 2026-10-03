import type { SeasonSetupStepId } from '../application/deriveSeasonSetupSteps';

import type { SeasonSetupStackParamList } from './types';

export type SeasonSetupEarlyRouteName = Exclude<
  keyof SeasonSetupStackParamList,
  'EligibilityAge'
>;

/**
 * Maps a derived step id to an early route.
 * Which step is current comes from deriveSeasonSetupSteps, not from an age band.
 * Region is a boundary, not a screen in this slice.
 */
export function seasonSetupRouteForStep(
  step: SeasonSetupStepId,
): SeasonSetupEarlyRouteName | 'region' | null {
  switch (step) {
    case 'placementChoice':
      return 'PlacementChoice';
    case 'firstYear':
      return 'FirstYear';
    case 'studyTrack':
      return 'StudyTrack';
    case 'region':
      return 'region';
    case 'eligibilityAge':
    case 'review':
    case 'complete':
      return null;
    default: {
      const unexpected: never = step;
      return unexpected;
    }
  }
}
