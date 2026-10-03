import type { SeasonSetupStepId } from '../application/deriveSeasonSetupSteps';

import type { SeasonSetupStackParamList } from './types';

export type SeasonSetupRouteName = Exclude<keyof SeasonSetupStackParamList, 'EligibilityAge'>;

/**
 * Maps a derived step id to a route.
 * Which step is current comes from deriveSeasonSetupSteps.
 * Complete stays off the stack.
 */
export function seasonSetupRouteForStep(step: SeasonSetupStepId): SeasonSetupRouteName | null {
  switch (step) {
    case 'placementChoice':
      return 'PlacementChoice';
    case 'firstYear':
      return 'FirstYear';
    case 'studyTrack':
      return 'StudyTrack';
    case 'region':
      return 'Region';
    case 'review':
      return 'Review';
    case 'eligibilityAge':
    case 'complete':
      return null;
    default: {
      const unexpected: never = step;
      return unexpected;
    }
  }
}
