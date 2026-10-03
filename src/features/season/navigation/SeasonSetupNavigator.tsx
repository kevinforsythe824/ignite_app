import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { EligibilityAgeScreen } from '../screens/EligibilityAgeScreen';
import { FirstYearScreen } from '../screens/FirstYearScreen';
import { PlacementChoiceScreen } from '../screens/PlacementChoiceScreen';
import { RegionScreen } from '../screens/RegionScreen';
import { ReviewScreen } from '../screens/ReviewScreen';
import { StudyTrackScreen } from '../screens/StudyTrackScreen';

import type { SeasonSetupStackParamList } from './types';

const Stack = createNativeStackNavigator<SeasonSetupStackParamList>();

/**
 * Season Setup stack. Header hidden.
 * The provider owns answers. Route params stay empty.
 */
export function SeasonSetupNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator initialRouteName="EligibilityAge" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EligibilityAge" component={EligibilityAgeScreen} />
      <Stack.Screen name="PlacementChoice" component={PlacementChoiceScreen} />
      <Stack.Screen name="FirstYear" component={FirstYearScreen} />
      <Stack.Screen name="StudyTrack" component={StudyTrackScreen} />
      <Stack.Screen name="Region" component={RegionScreen} />
      <Stack.Screen name="Review" component={ReviewScreen} />
    </Stack.Navigator>
  );
}
