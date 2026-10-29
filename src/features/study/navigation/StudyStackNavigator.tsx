import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { FlashcardStudyRoute } from '../../flashcards/screens/FlashcardStudyRoute';
import { AnnotatedScriptureListScreen } from '../screens/AnnotatedScriptureListScreen';
import { StudyHubScreen } from '../screens/StudyHubScreen';
import { StudyCurriculumGate } from '../state/StudyCurriculumGate';
import type { StudyStackParamList } from './types';

const Stack = createNativeStackNavigator<StudyStackParamList>();

function StudyStack(): React.JSX.Element {
  return (
    <Stack.Navigator initialRouteName="StudyHub" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StudyHub" component={StudyHubScreen} />
      <Stack.Screen name="FlashcardStudy" component={FlashcardStudyRoute} />
      <Stack.Screen name="AnnotatedScriptureList" component={AnnotatedScriptureListScreen} />
    </Stack.Navigator>
  );
}

/**
 * Nested stack under the Study tab. The hub is the entry. Flashcards is pushed
 * for Study All or one section. The scripture list is pushed for View All
 * Material and reads the same gate curriculum.
 *
 * Do not add blur-unmount or detach options that remount FlashcardSessionProvider
 * when the Study tab blurs — an in-progress session must survive tab switches.
 * The curriculum gate stays mounted with this stack, so moving between the hub
 * and Flashcards does not load the MaterialSet again.
 */
export function StudyStackNavigator(): React.JSX.Element {
  return (
    <StudyCurriculumGate>
      <StudyStack />
    </StudyCurriculumGate>
  );
}
