import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import FlashcardStudyRoute from '../../features/flashcards/screens/FlashcardStudyRoute';
import HomeScreen from '../../screens/HomeScreen';
import PracticeScreen from '../../screens/PracticeScreen';
import ProfileScreen from '../../screens/ProfileScreen';
import { colors } from '../../shared/theme';
import { PracticeTabIcon } from './PracticeTabIcon';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<
  Exclude<keyof MainTabParamList, 'Practice'>,
  { focused: IoniconName; idle: IoniconName }
> = {
  Home: { focused: 'home', idle: 'home-outline' },
  Study: { focused: 'reader-outline', idle: 'reader-outline' },
  Profile: { focused: 'person', idle: 'person-outline' },
};

/** Clipboard geometry sits optically high vs Ionicons; nudge the glyph only. */
const PRACTICE_ICON_TRANSLATE_Y = 2;

/** MVP tab shell. Study (Flashcards) is the default entry tab. AI Coach is Post-MVP. */
export function BottomTabNavigator(): React.JSX.Element {
  return (
    <Tab.Navigator
      initialRouteName="Study"
      screenOptions={({ route }) => ({
        headerShown: false,
        lazy: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Practice') {
            return (
              <View style={styles.practiceIcon}>
                <PracticeTabIcon color={color} size={size} />
              </View>
            );
          }
          const icons = TAB_ICONS[route.name];
          return <Ionicons name={focused ? icons.focused : icons.idle} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Study" component={FlashcardStudyRoute} options={{ title: 'Study' }} />
      <Tab.Screen name="Practice" component={PracticeScreen} options={{ title: 'Practice' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  practiceIcon: {
    transform: [{ translateY: PRACTICE_ICON_TRANSLATE_Y }],
  },
});

export default BottomTabNavigator;
