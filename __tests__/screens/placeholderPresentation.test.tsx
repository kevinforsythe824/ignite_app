import { render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import HomeScreen from '../../src/screens/HomeScreen';
import { PlaceholderScreen } from '../../src/screens/PlaceholderScreen';
import PracticeScreen from '../../src/screens/PracticeScreen';
import TournamentDetailsScreen from '../../src/screens/TournamentDetailsScreen';
import { colors, spacing, typography } from '../../src/shared/theme';

/** Auth Brand Mode canvases must never leak onto Main Product Mode surfaces. */
const AUTH_BRAND_COLORS = [
  colors.authAccent,
  colors.authBackgroundStart,
  colors.authBackgroundEnd,
  colors.brandWarmBackground,
];

type FlattenedStyle = ViewStyle & TextStyle;

interface StyledElement {
  props: { style?: StyleProp<FlattenedStyle> };
}

function flattenStyle(element: StyledElement): FlattenedStyle {
  return StyleSheet.flatten(element.props.style) ?? {};
}

type RenderedScreen = Awaited<ReturnType<typeof render>>;

function expectProductPlaceholder(screen: RenderedScreen, title: string, description: string) {
  const canvas = flattenStyle(screen.getByTestId('placeholder-canvas'));
  expect(canvas.backgroundColor).toBe(colors.background);
  expect(AUTH_BRAND_COLORS).not.toContain(canvas.backgroundColor);

  const titleNode = screen.getByTestId('placeholder-title');
  expect(titleNode.props.accessibilityRole).toBe('header');
  expect(screen.getByText(title)).toBe(titleNode);

  const titleStyle = flattenStyle(titleNode);
  expect(titleStyle.fontFamily).toBe(typography.screenTitle.fontFamily);
  expect(titleStyle.fontSize).toBe(typography.screenTitle.fontSize);
  expect(titleStyle.color).toBe(colors.textPrimary);
  // Documented anti-pattern: verseReference must never act as a page H1.
  expect(titleStyle.fontFamily).not.toBe(typography.verseReference.fontFamily);
  expect(titleStyle.textAlign).not.toBe('center');

  const descriptionNode = screen.getByTestId('placeholder-description');
  expect(screen.getByText(description)).toBe(descriptionNode);
  const descriptionStyle = flattenStyle(descriptionNode);
  expect(descriptionStyle.fontFamily).toBe(typography.bodySecondary.fontFamily);
  expect(descriptionStyle.fontSize).toBe(typography.bodySecondary.fontSize);
  expect(descriptionStyle.color).toBe(colors.textSecondary);
  expect(AUTH_BRAND_COLORS).not.toContain(descriptionStyle.color);

  expect(screen.queryByRole('button')).toBeNull();
}

describe('PlaceholderScreen Product Mode presentation', () => {
  it('uses Product Mode semantics for a generic title and supporting copy', async () => {
    const screen = await render(
      <PlaceholderScreen title="Placeholder" description="This feature arrives in a later sprint." />,
    );

    expectProductPlaceholder(screen, 'Placeholder', 'This feature arrives in a later sprint.');

    const canvas = flattenStyle(screen.getByTestId('placeholder-canvas'));
    expect(canvas.paddingHorizontal).toBeUndefined();
    expect(flattenStyle(screen.getByTestId('placeholder-title').parent as StyledElement).paddingHorizontal).toBe(
      spacing.screenPaddingH,
    );
  });

  it('keeps Home, Practice, and TournamentDetails as thin placeholder wrappers', async () => {
    const home = await render(<HomeScreen />);
    expectProductPlaceholder(
      home,
      'Home',
      'Dashboard, recent decks, and tournament preview will live here.',
    );
    expect(home.queryByText(/weekly streak/i)).toBeNull();
    expect(home.queryByText(/search your material/i)).toBeNull();
    expect(home.queryByText(/upcoming tournament/i)).toBeNull();

    const practice = await render(<PracticeScreen />);
    expectProductPlaceholder(practice, 'Practice', 'Quiz setup and practice modes will live here.');
    expect(practice.queryByText(/challenge/i)).toBeNull();
    expect(practice.queryByText(/progress/i)).toBeNull();

    const tournament = await render(<TournamentDetailsScreen />);
    expectProductPlaceholder(
      tournament,
      'Tournament Details',
      'Venue map, countdown, and required material will live here.',
    );
    expect(tournament.queryByText(/get directions/i)).toBeNull();
    expect(tournament.queryByText(/required material list/i)).toBeNull();
  });
});
