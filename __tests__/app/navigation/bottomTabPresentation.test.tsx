import { NavigationContainer } from '@react-navigation/native';
import { render } from '@testing-library/react-native';
import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { BottomTabNavigator } from '../../../src/app/navigation/BottomTabNavigator';
import { colors } from '../../../src/shared/theme';

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

jest.mock('../../../src/features/study/navigation/StudyStackNavigator', () => {
  const React = require('react');
  const { Text } = require('react-native');
  function StudyStub() {
    return React.createElement(Text, null, 'Study stub');
  }
  return { __esModule: true, StudyStackNavigator: StudyStub };
});

const AUTH_BRAND_COLORS = [
  colors.authAccent,
  colors.authBackgroundStart,
  colors.authBackgroundEnd,
  colors.brandWarmBackground,
];

const TAB_LABELS = ['Home', 'Study', 'Practice', 'Profile'] as const;

type FlattenedStyle = ViewStyle & TextStyle;

interface StyledElement {
  parent?: unknown;
  props: { style?: StyleProp<FlattenedStyle> };
}

function flattenStyle(element: StyledElement): FlattenedStyle {
  return StyleSheet.flatten(element.props.style) ?? {};
}

function findAncestorStyle(
  element: StyledElement,
  predicate: (style: FlattenedStyle) => boolean,
): FlattenedStyle | undefined {
  let current: unknown = element.parent;
  while (current && typeof current === 'object') {
    const node = current as StyledElement;
    const style = flattenStyle(node);
    if (predicate(style)) {
      return style;
    }
    current = node.parent;
  }
  return undefined;
}

function hasTranslateY(style: FlattenedStyle, value: number): boolean {
  return Boolean(
    Array.isArray(style.transform) &&
      style.transform.some(
        (entry) =>
          typeof entry === 'object' &&
          entry != null &&
          'translateY' in entry &&
          entry.translateY === value,
      ),
  );
}

function getTab(
  screen: Awaited<ReturnType<typeof renderTabs>>,
  label: (typeof TAB_LABELS)[number],
) {
  return screen.getByLabelText(new RegExp(`^${label}, tab`));
}

async function renderTabs() {
  return render(
    <NavigationContainer>
      <BottomTabNavigator />
    </NavigationContainer>,
  );
}

describe('Main Product bottom tab shell', () => {
  it('uses Product Mode semantic tokens and keeps Study as the initial tab', async () => {
    const screen = await renderTabs();

    expect(TAB_LABELS.map((label) => getTab(screen, label).props.accessibilityLabel)).toEqual([
      'Home, tab, 1 of 4',
      'Study, tab, 2 of 4',
      'Practice, tab, 3 of 4',
      'Profile, tab, 4 of 4',
    ]);

    expect(getTab(screen, 'Study').props.accessibilityState?.selected).toBe(true);
    expect(getTab(screen, 'Home').props.accessibilityState?.selected).not.toBe(true);
    expect(screen.getByText('Study stub')).toBeTruthy();
    expect(screen.queryByText('Home stub')).toBeNull();

    const tabBar = findAncestorStyle(
      getTab(screen, 'Study'),
      (style) => style.backgroundColor != null && style.borderTopColor != null,
    );
    expect(tabBar?.backgroundColor).toBe(colors.surface);
    expect(tabBar?.borderTopColor).toBe(colors.border);
    expect(AUTH_BRAND_COLORS).not.toContain(tabBar?.backgroundColor);
    expect(AUTH_BRAND_COLORS).not.toContain(tabBar?.borderTopColor);

    const studyLabel = flattenStyle(screen.getByText('Study'));
    const homeLabel = flattenStyle(screen.getByText('Home'));
    expect(studyLabel.color).toBe(colors.accent);
    expect(studyLabel.color).not.toBe(colors.authAccent);
    expect(homeLabel.color).toBe(colors.textMuted);

    expect(screen.getByText('home')).toBeTruthy();
    expect(screen.getByText('home-outline')).toBeTruthy();
    expect(screen.getAllByText('reader-outline').length).toBeGreaterThan(0);
    expect(screen.getByText('person')).toBeTruthy();
    expect(screen.getByText('person-outline')).toBeTruthy();
    expect(screen.queryByText('clipboard')).toBeNull();
    expect(screen.queryByText('clipboard-outline')).toBeNull();

    const practiceNudge = screen.container.queryAll((node) =>
      hasTranslateY(flattenStyle(node as StyledElement), 2),
    );
    expect(practiceNudge.length).toBeGreaterThan(0);
  });

  it('does not reference legacy or Auth Brand color keys in the tab shell', () => {
    const source = readFileSync(
      join(__dirname, '../../../src/app/navigation/BottomTabNavigator.tsx'),
      'utf8',
    );

    expect(source).toContain('tabBarActiveTintColor: colors.accent');
    expect(source).toContain('tabBarInactiveTintColor: colors.textMuted');
    expect(source).toContain('backgroundColor: colors.surface');
    expect(source).toContain('borderTopColor: colors.border');
    expect(source).toContain('initialRouteName="Study"');
    expect(source).toContain('PRACTICE_ICON_TRANSLATE_Y = 2');
    expect(source).toContain("Home: { focused: 'home', idle: 'home-outline' }");
    expect(source).toContain("Study: { focused: 'reader-outline', idle: 'reader-outline' }");
    expect(source).toContain("Profile: { focused: 'person', idle: 'person-outline' }");
    expect(source).toContain('PracticeTabIcon');
    expect(source).toContain('component={StudyStackNavigator}');
    expect(source).not.toContain('unmountOnBlur');
    expect(source).not.toContain('FlashcardStudyRoute');
    expect(source).not.toContain('StudyScreen');

    expect(source).not.toContain('accentRed');
    expect(source).not.toContain('cardWhite');
    expect(source).not.toContain('borderLight');
    expect(source).not.toContain('authAccent');
    expect(source).not.toContain('authBackground');
    expect(source).not.toContain('brandWarmBackground');
  });
});
