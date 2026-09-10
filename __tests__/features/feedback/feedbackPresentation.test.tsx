import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { render, userEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { feedbackCopy } from '../../../src/features/feedback/copy/feedbackCopy';
import { FeedbackError } from '../../../src/features/feedback/errors/feedbackError';
import { FeedbackRepositoryContextProvider } from '../../../src/features/feedback/hooks/useFeedbackRepository';
import { FeedbackComposeScreen } from '../../../src/features/feedback/screens/FeedbackComposeScreen';
import { HelpAndFeedbackScreen } from '../../../src/features/feedback/screens/HelpAndFeedbackScreen';
import type { ProfileStackParamList } from '../../../src/features/profile/navigation/types';
import { colors, radius, spacing, typography } from '../../../src/shared/theme';
import { createFeedbackRepositoryFake } from '../../../test-utils/feedbackRepositoryFake';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

/** Auth Brand Mode canvases must never leak onto Main Product Mode surfaces. */
const AUTH_CANVAS_COLORS = [
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

function expectGroupedCardChrome(element: StyledElement) {
  const card = flattenStyle(element);
  expect(card.backgroundColor).toBe(colors.surface);
  expect(card.borderColor).toBe(colors.border);
  expect(card.borderRadius).toBe(radius.card);
}

function findAncestorBackground(element: { parent?: unknown }): string | undefined {
  let current: unknown = element.parent;
  while (current && typeof current === 'object') {
    const node = current as StyledElement & { parent?: unknown };
    const style = flattenStyle(node);
    if (typeof style.backgroundColor === 'string' && style.backgroundColor !== 'transparent') {
      return style.backgroundColor;
    }
    current = node.parent;
  }
  return undefined;
}

function expectProductCanvas(element: { parent?: unknown }) {
  const background = findAncestorBackground(element);
  expect(background).toBe(colors.background);
  expect(AUTH_CANVAS_COLORS).not.toContain(background);
}

function expectProductFieldChrome(input: StyledElement & { parent?: unknown }) {
  const row = flattenStyle((input.parent ?? input) as StyledElement);
  expect(row.backgroundColor).toBe(colors.surface);
  expect(row.borderColor).toBe(colors.border);
  expect(row.minHeight).toBeGreaterThanOrEqual(spacing.minTouchTarget);
}

function expectProductPrimaryButton(element: StyledElement) {
  const style = flattenStyle(element);
  expect(style.backgroundColor).toBe(colors.accent);
  expect(style.backgroundColor).not.toBe(colors.authAccent);
  expect(style.minHeight).toBeGreaterThanOrEqual(spacing.minTouchTarget);
}

async function renderFeedbackStack(
  repository = createFeedbackRepositoryFake(),
  initial: keyof ProfileStackParamList = 'HelpAndFeedback',
) {
  const screen = await render(
    <FeedbackRepositoryContextProvider value={repository}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initial}>
          <Stack.Screen name="HelpAndFeedback" component={HelpAndFeedbackScreen} />
          <Stack.Screen
            name="FeedbackCompose"
            component={FeedbackComposeScreen}
            initialParams={{ category: 'bug' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </FeedbackRepositoryContextProvider>,
  );
  return { screen, repository };
}

describe('Help & Feedback Product Mode presentation', () => {
  it('renders the hub on the product canvas with Settings card language', async () => {
    const { screen } = await renderFeedbackStack();

    const scroll = flattenStyle(screen.getByTestId('help-feedback-scroll'));
    expect(scroll.backgroundColor).toBe(colors.background);
    expect(AUTH_CANVAS_COLORS).not.toContain(scroll.backgroundColor);

    const supporting = flattenStyle(screen.getByTestId('help-feedback-supporting'));
    expect(supporting.fontFamily).toBe(typography.bodySecondary.fontFamily);
    expect(supporting.fontSize).toBe(typography.bodySecondary.fontSize);
    expect(supporting.color).toBe(colors.textSecondary);

    expectGroupedCardChrome(screen.getByTestId('help-feedback-section'));

    for (const testID of [
      'help-feedback-bug',
      'help-feedback-feature',
      'help-feedback-general',
    ]) {
      const row = screen.getByTestId(testID);
      expect(row.props.accessibilityRole).toBe('button');
      expect(flattenStyle(row).minHeight).toBeGreaterThanOrEqual(spacing.minTouchTarget);
    }

    expect(screen.getByText(feedbackCopy.hub.reportBug)).toBeTruthy();
    expect(screen.getByText(feedbackCopy.hub.requestFeature)).toBeTruthy();
    expect(screen.getByText(feedbackCopy.hub.general)).toBeTruthy();
    expect(screen.queryByText(/faq/i)).toBeNull();
    expect(screen.queryByText(/contact support/i)).toBeNull();
    expect(screen.queryByText(/github/i)).toBeNull();
  });

  it('renders compose as a Product Mode form, not Auth Brand Mode', async () => {
    const { screen } = await renderFeedbackStack(createFeedbackRepositoryFake(), 'FeedbackCompose');

    const title = await screen.findByTestId('feedback-compose-title');
    expectProductCanvas(title);
    const titleStyle = flattenStyle(title);
    expect(titleStyle.fontFamily).toBe(typography.sectionTitle.fontFamily);
    expect(titleStyle.fontSize).toBe(typography.sectionTitle.fontSize);
    expect(titleStyle.color).toBe(colors.textPrimary);
    expect(title).toHaveTextContent(feedbackCopy.compose.bugTitle);

    const privacy = flattenStyle(screen.getByTestId('feedback-privacy-note'));
    expect(privacy.fontFamily).toBe(typography.helper.fontFamily);
    expect(privacy.fontSize).toBe(typography.helper.fontSize);
    expect(privacy.color).toBe(colors.textSecondary);

    const titleLabel = flattenStyle(screen.getByText(feedbackCopy.compose.titleLabel));
    expect(titleLabel.fontFamily).toBe(typography.label.fontFamily);
    expect(titleLabel.fontSize).toBe(typography.label.fontSize);

    expectProductFieldChrome(screen.getByTestId('feedback-title'));
    expectProductFieldChrome(screen.getByTestId('feedback-message'));
    expectProductPrimaryButton(screen.getByTestId('feedback-submit'));
  });

  it('styles compose submission failure with the danger token, not accent', async () => {
    const user = userEvent.setup();
    const repository = createFeedbackRepositoryFake({
      submitError: new FeedbackError('unavailable', feedbackCopy.errors.unavailable),
    });
    const { screen } = await renderFeedbackStack(repository, 'FeedbackCompose');

    await user.type(
      screen.getByTestId('feedback-message'),
      'Practice button did not respond during synthetic DEV testing.',
    );
    await user.press(screen.getByTestId('feedback-submit'));

    const errorStyle = flattenStyle(await screen.findByTestId('feedback-error'));
    expect(errorStyle.color).toBe(colors.danger);
    expect(errorStyle.color).not.toBe(colors.accent);
    expect(errorStyle.color).not.toBe(colors.authAccent);
    expect(errorStyle.color).not.toBe(colors.accentRed);
  });

  it('keeps compose success on Product Mode', async () => {
    const user = userEvent.setup();
    const { screen } = await renderFeedbackStack(
      createFeedbackRepositoryFake(),
      'FeedbackCompose',
    );

    await user.type(
      await screen.findByTestId('feedback-message'),
      'Practice button did not respond during synthetic DEV testing.',
    );
    await user.press(screen.getByTestId('feedback-submit'));

    const successTitle = await screen.findByTestId('feedback-success-title');
    expect(successTitle).toHaveTextContent(feedbackCopy.success.title);
    expectProductCanvas(successTitle);
    const titleStyle = flattenStyle(successTitle);
    expect(titleStyle.fontFamily).toBe(typography.sectionTitle.fontFamily);
    expect(titleStyle.color).toBe(colors.textPrimary);
    expect(screen.getByText(feedbackCopy.success.body)).toBeTruthy();
    expectProductPrimaryButton(screen.getByTestId('feedback-success-done'));
  });

  it('routes hub categories to compose without changing payloads', async () => {
    const user = userEvent.setup();
    const { screen } = await renderFeedbackStack();

    await user.press(screen.getByTestId('help-feedback-feature'));
    expect(await screen.findByTestId('feedback-compose-title')).toHaveTextContent(
      feedbackCopy.compose.featureTitle,
    );
    expectProductCanvas(screen.getByTestId('feedback-compose-title'));
  });

  it('submits the same category payload after the visual restyle', async () => {
    const user = userEvent.setup();
    const { screen, repository } = await renderFeedbackStack(
      createFeedbackRepositoryFake(),
      'FeedbackCompose',
    );

    await user.type(
      screen.getByTestId('feedback-message'),
      'Practice button did not respond during synthetic DEV testing.',
    );
    await user.press(screen.getByTestId('feedback-submit'));

    await waitFor(() => {
      expect(repository.submit).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'bug',
          title: null,
          message: 'Practice button did not respond during synthetic DEV testing.',
        }),
      );
    });
  });
});
