import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';

import { EligibilityAgeScreen } from '../screens/EligibilityAgeScreen';
import { FirstYearScreen } from '../screens/FirstYearScreen';
import { PlacementChoiceScreen } from '../screens/PlacementChoiceScreen';
import { StudyTrackScreen } from '../screens/StudyTrackScreen';

import { SeasonSetupBoundaryProvider } from './seasonSetupBoundary';
import type { SeasonSetupRegionBoundary, SeasonSetupStackParamList } from './types';

const Stack = createNativeStackNavigator<SeasonSetupStackParamList>();

export interface SeasonSetupNavigatorProps {
  /**
   * Called when deriveSeasonSetupSteps says the next step is region.
   * Phase 3C.3 registers the Region screen. This navigator does not render a placeholder.
   */
  onReachedRegionBoundary?: (boundary: SeasonSetupRegionBoundary) => void;
}

/**
 * Early Season Setup stack. Header hidden.
 * Routes are EligibilityAge, PlacementChoice, FirstYear, and StudyTrack.
 * The provider owns answers. Route params stay empty.
 */
export function SeasonSetupNavigator({
  onReachedRegionBoundary,
}: SeasonSetupNavigatorProps): React.JSX.Element {
  const boundary = useMemo(
    () => ({ onReachedRegionBoundary }),
    [onReachedRegionBoundary],
  );

  return (
    <SeasonSetupBoundaryProvider value={boundary}>
      <Stack.Navigator
        initialRouteName="EligibilityAge"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="EligibilityAge" component={EligibilityAgeScreen} />
        <Stack.Screen name="PlacementChoice" component={PlacementChoiceScreen} />
        <Stack.Screen name="FirstYear" component={FirstYearScreen} />
        <Stack.Screen name="StudyTrack" component={StudyTrackScreen} />
      </Stack.Navigator>
    </SeasonSetupBoundaryProvider>
  );
}
