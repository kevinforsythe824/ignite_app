import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';

import { BottomTabNavigator } from '../../../src/app/navigation/BottomTabNavigator';
import { StudyStackNavigator } from '../../../src/features/study/navigation/StudyStackNavigator';

jest.mock('../../../src/features/study/state/StudyCurriculumGate', () => {
  const ReactModule = require('react');
  return {
    StudyCurriculumGate: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(ReactModule.Fragment, null, children),
  };
});

jest.mock('../../../src/features/study/screens/StudyHubScreen', () => {
  const ReactModule = require('react');
  const { Pressable, Text } = require('react-native');
  const { useNavigation } = require('@react-navigation/native');

  function StudyHubStub() {
    const navigation = useNavigation();
    return ReactModule.createElement(
      ReactModule.Fragment,
      null,
      ReactModule.createElement(Text, null, 'Study hub'),
      ReactModule.createElement(
        Pressable,
        {
          accessibilityLabel: 'Open flashcards',
          onPress: () => navigation.navigate('FlashcardStudy'),
        },
        ReactModule.createElement(Text, null, 'Open flashcards'),
      ),
    );
  }

  return { StudyHubScreen: StudyHubStub };
});

jest.mock('../../../src/features/flashcards/screens/FlashcardStudyRoute', () => {
  const ReactModule = require('react');
  const { Text } = require('react-native');
  function FlashcardStudyStub() {
    return ReactModule.createElement(Text, null, 'FlashcardStudy engine');
  }
  return { __esModule: true, FlashcardStudyRoute: FlashcardStudyStub, default: FlashcardStudyStub };
});

jest.mock('../../../src/screens/HomeScreen', () => {
  const React = require('react');
  const { Text } = require('react-native');
  function HomeStub() {
    return React.createElement(Text, null, 'Home stub');
  }
  return { __esModule: true, default: HomeStub };
});

jest.mock('../../../src/screens/PracticeScreen', () => {
  const React = require('react');
  const { Text } = require('react-native');
  function PracticeStub() {
    return React.createElement(Text, null, 'Practice stub');
  }
  return { __esModule: true, default: PracticeStub };
});

jest.mock('../../../src/screens/ProfileScreen', () => {
  const React = require('react');
  const { Text } = require('react-native');
  function ProfileStub() {
    return React.createElement(Text, null, 'Profile stub');
  }
  return { __esModule: true, default: ProfileStub };
});

describe('StudyStackNavigator', () => {
  it('opens the Study hub before Flashcards', async () => {
    await render(
      <NavigationContainer>
        <StudyStackNavigator />
      </NavigationContainer>,
    );

    await waitFor(() => {
      expect(screen.getByText('Study hub')).toBeTruthy();
    });
    expect(screen.queryByText('FlashcardStudy engine')).toBeNull();
  });

  it('keeps the stack header hidden and does not remount the session on tab blur', () => {
    const stackSource = readFileSync(
      join(__dirname, '../../../src/features/study/navigation/StudyStackNavigator.tsx'),
      'utf8',
    );
    const tabSource = readFileSync(
      join(__dirname, '../../../src/app/navigation/BottomTabNavigator.tsx'),
      'utf8',
    );

    expect(stackSource).toContain('initialRouteName="StudyHub"');
    expect(stackSource).toContain('headerShown: false');
    expect(stackSource).toContain('FlashcardStudyRoute');
    expect(stackSource).toContain('StudyHubScreen');
    expect(stackSource).not.toMatch(/unmountOnBlur\s*:/);
    expect(stackSource).not.toContain('detachInactiveScreens');

    expect(tabSource).toContain('component={StudyStackNavigator}');
    expect(tabSource).not.toMatch(/unmountOnBlur\s*:/);
    expect(tabSource).not.toContain('StudyScreen');
  });

  it('nests MainTabParamList.Study under StudyStackParamList', () => {
    const typesSource = readFileSync(
      join(__dirname, '../../../src/app/navigation/types.ts'),
      'utf8',
    );

    expect(typesSource).toContain('StudyStackParamList');
    expect(typesSource).toMatch(
      /Study:\s*NavigatorScreenParams<StudyStackParamList>\s*\|\s*undefined/,
    );
  });
});

describe('Study tab session lifecycle contract', () => {
  /**
   * Simulator gate (6D): after answering a card, switch Study → Home/Practice/Profile → Study
   * and confirm index/grades/settings are unchanged. Automated coverage asserts the mount
   * contract that preserves FlashcardSessionProvider (no unmountOnBlur / no StudyScreen wrapper).
   */
  it('mounts StudyStackNavigator directly so the provider is not remounted on tab blur', async () => {
    await render(
      <NavigationContainer>
        <BottomTabNavigator />
      </NavigationContainer>,
    );

    await waitFor(() => {
      expect(screen.getByText('Study hub')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Open flashcards'));
    await waitFor(() => {
      expect(screen.getByText('FlashcardStudy engine')).toBeTruthy();
    });

    // Lazy tabs: leave Study then return — the nested flashcard screen stays mounted.
    fireEvent.press(screen.getByLabelText(/^Home, tab/));
    await waitFor(() => {
      expect(screen.getByText('Home stub')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText(/^Study, tab/));
    await waitFor(() => {
      expect(screen.getByText('FlashcardStudy engine')).toBeTruthy();
    });
  });
});
