import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import AiCoachScreen from '../../screens/AiCoachScreen';
import FlashcardStudyScreen from '../../screens/FlashcardStudyScreen';
import HomeScreen from '../../screens/HomeScreen';
import PracticeScreen from '../../screens/PracticeScreen';
import ProfileScreen from '../../screens/ProfileScreen';
import { colors } from '../../shared/theme';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof MainTabParamList, { focused: TabIconName; idle: TabIconName }> = {
  Home: { focused: 'home', idle: 'home-outline' },
  Study: { focused: 'book', idle: 'book-outline' },
  AiCoach: { focused: 'sparkles', idle: 'sparkles-outline' },
  Practice: { focused: 'fitness', idle: 'fitness-outline' },
  Profile: { focused: 'person', idle: 'person-outline' },
};

/** PRD 5-slot shell. Study (Flashcards) is the default entry tab. */
export function BottomTabNavigator(): React.JSX.Element {
  return (
    <Tab.Navigator
      initialRouteName="Study"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accentRed,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.cardWhite,
          borderTopColor: colors.borderLight,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          return <Ionicons name={focused ? icons.focused : icons.idle} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Study" component={FlashcardStudyScreen} options={{ title: 'Study' }} />
      <Tab.Screen name="AiCoach" component={AiCoachScreen} options={{ title: 'AI Coach' }} />
      <Tab.Screen name="Practice" component={PracticeScreen} options={{ title: 'Practice' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default BottomTabNavigator;
