import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { FlashcardStudyRoute } from '../../flashcards/screens/FlashcardStudyRoute';
import type { StudyStackParamList } from './types';

const Stack = createNativeStackNavigator<StudyStackParamList>();

/**
 * Nested stack under the Study tab. Today the only screen is FlashcardStudy
 * (header hidden so StudyHeader remains the chrome). Future Study Home plugs
 * in here without retargeting BottomTabNavigator.
 *
 * Do not add blur-unmount or detach options that remount FlashcardSessionProvider
 * when the Study tab blurs — session must preserve across tab switches.
 */
export function StudyStackNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator initialRouteName="FlashcardStudy" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FlashcardStudy" component={FlashcardStudyRoute} />
    </Stack.Navigator>
  );
}
