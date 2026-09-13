import { NavigationContainer } from '@react-navigation/native';
import { render, userEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { AuthenticationError, AuthProvider } from '../../../src/features/auth';
import { authCopy } from '../../../src/features/auth/copy/authCopy';
import { quizzerProfileCopy } from '../../../src/features/profile/copy/quizzerProfileCopy';
import { ProfileStackNavigator } from '../../../src/features/profile/navigation/ProfileStackNavigator';
import { QuizzerProfileProvider } from '../../../src/features/profile/state/QuizzerProfileProvider';
import { colors, radius, spacing, typography } from '../../../src/shared/theme';
import { createAuthRepositoryFake } from '../../../test-utils/authRepositoryFake';
import { createQuizzerProfileRepositoryFake } from '../../../test-utils/quizzerProfileRepositoryFake';

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

/** Grouped card shell shared by the Profile nav card and the Settings sections. */
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

async function renderProfileStack(options?: {
  auth?: ReturnType<typeof createAuthRepositoryFake>;
}) {
  const auth =
    options?.auth ??
    createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-a',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
  const profiles = createQuizzerProfileRepositoryFake();
  profiles.seed({
    quizzerId: 'user-a',
    firstName: 'Ada',
    lastName: 'Lovelace',
    avatarId: null,
  });

  const screen = await render(
    <AuthProvider repository={auth}>
      <QuizzerProfileProvider repository={profiles}>
        <NavigationContainer>
          <ProfileStackNavigator />
        </NavigationContainer>
      </QuizzerProfileProvider>
    </AuthProvider>,
  );

  await waitFor(() => {
    expect(screen.getByTestId('profile-home-full-name')).toBeTruthy();
  });

  return { screen };
}

describe('Profile + Settings Product Mode presentation', () => {
  it('renders Profile on the product canvas with a Settings nav card and no future modules', async () => {
    const user = userEvent.setup();
    const { screen } = await renderProfileStack();

    const canvas = flattenStyle(screen.getByTestId('profile-home-canvas'));
    expect(canvas.backgroundColor).toBe(colors.background);
    expect(AUTH_CANVAS_COLORS).not.toContain(canvas.backgroundColor);

    const title = flattenStyle(screen.getByTestId('profile-home-title'));
    expect(title.fontFamily).toBe(typography.screenTitle.fontFamily);
    expect(title.fontSize).toBe(typography.screenTitle.fontSize);
    // Documented anti-pattern: verseReference must never act as a page H1.
    expect(title.fontFamily).not.toBe(typography.verseReference.fontFamily);

    expectGroupedCardChrome(screen.getByTestId('profile-home-settings-card'));

    const navRow = screen.getByTestId('profile-home-settings');
    expect(navRow.props.accessibilityRole).toBe('button');
    expect(navRow.props.accessibilityLabel).toBe(quizzerProfileCopy.profile.settings);
    expect(flattenStyle(navRow).minHeight).toBeGreaterThanOrEqual(spacing.minTouchTarget);

    expect(screen.queryByText(/notifications/i)).toBeNull();
    expect(screen.queryByText(/activity/i)).toBeNull();
    expect(screen.queryByText(/view all/i)).toBeNull();
    expect(screen.queryByText(/weekly streak/i)).toBeNull();

    await user.press(navRow);
    expect(await screen.findByTestId('settings-email')).toBeTruthy();
  });

  it('shows a chevron-only back control on Settings without the previous route name', async () => {
    const user = userEvent.setup();
    const { screen } = await renderProfileStack();

    await user.press(screen.getByTestId('profile-home-settings'));
    expect(await screen.findByTestId('settings-email')).toBeTruthy();

    expect(screen.queryByText('ProfileHome')).toBeNull();

    const settingsHeader = screen.container.queryAll(
      (node) =>
        node.type === 'RNSScreenStackHeaderConfig' &&
        node.props.title === quizzerProfileCopy.settings.title,
    )[0];
    expect(settingsHeader).toBeTruthy();
    expect(settingsHeader.props.color).toBe(colors.textPrimary);
    expect(settingsHeader.props.titleColor).toBe(colors.textPrimary);
    // Custom headerLeft replaces the iOS 26 liquid-glass system back control.
    // Keep the native-stack fallback that also hides the previous-route title.
    expect(
      settingsHeader.props.backButtonDisplayMode === 'minimal' ||
        settingsHeader.props.backTitleVisible === false,
    ).toBe(true);

    const leftHeaderItem = screen.container.queryAll(
      (node) => node.props.type === 'left' && node.props.hidesSharedBackground === true,
    )[0];
    expect(leftHeaderItem).toBeTruthy();

    const backButton = screen.getByLabelText(authCopy.actions.back);
    expect(backButton.props.accessibilityRole).toBe('button');
    const backStyle = flattenStyle(backButton);
    expect(backStyle.backgroundColor).toBe('transparent');
    expect(backStyle.minHeight).toBeGreaterThanOrEqual(spacing.minTouchTarget);
    expect(backStyle.minWidth).toBeGreaterThanOrEqual(spacing.minTouchTarget);
    expect(screen.getByTestId('settings-email')).toBeTruthy();

    const profileHomeHeader = screen.container.queryAll(
      (node) => node.props.title === 'ProfileHome',
    )[0];
    expect(profileHomeHeader?.props.hidden).toBe(true);

    await user.press(backButton);
    expect(await screen.findByTestId('profile-home-full-name')).toBeTruthy();
    expect(screen.queryByLabelText(authCopy.actions.back)).toBeNull();
  });

  it('groups Settings into Personal Information and Support without inventing rows', async () => {
    const user = userEvent.setup();
    const { screen } = await renderProfileStack();

    await user.press(screen.getByTestId('profile-home-settings'));

    expect(
      await screen.findByText(quizzerProfileCopy.settings.personalInformation),
    ).toBeTruthy();
    expect(screen.getByText(quizzerProfileCopy.settings.support)).toBeTruthy();

    const scroll = flattenStyle(screen.getByTestId('settings-scroll'));
    expect(scroll.backgroundColor).toBe(colors.background);
    expect(AUTH_CANVAS_COLORS).not.toContain(scroll.backgroundColor);

    expectGroupedCardChrome(screen.getByTestId('settings-section-personal'));
    expectGroupedCardChrome(screen.getByTestId('settings-section-support'));

    for (const testID of [
      'settings-email',
      'settings-edit-name',
      'settings-change-email',
      'settings-change-password',
      'settings-help-feedback',
      'settings-about',
      'settings-sign-out',
    ]) {
      expect(screen.getByTestId(testID)).toBeTruthy();
    }

    // Every Settings row stays a comfortable touch target (UI system §14).
    for (const testID of [
      'settings-email',
      'settings-edit-name',
      'settings-change-email',
      'settings-change-password',
      'settings-help-feedback',
      'settings-about',
    ]) {
      expect(flattenStyle(screen.getByTestId(testID)).minHeight).toBeGreaterThanOrEqual(
        spacing.minTouchTarget,
      );
    }

    expect(screen.getByText(quizzerProfileCopy.settings.editName)).toBeTruthy();
    expect(screen.queryByText(/change username/i)).toBeNull();
    expect(screen.queryByText(/offline study/i)).toBeNull();
    expect(screen.queryByText(/download cards/i)).toBeNull();
    expect(screen.queryByText(/auto-download/i)).toBeNull();
    expect(screen.queryByText(/preferences/i)).toBeNull();
    expect(screen.queryByText(/push notifications/i)).toBeNull();
    expect(screen.queryByText(/dark mode/i)).toBeNull();
  });

  it('styles Sign Out failure with the danger token, not the product accent', async () => {
    const user = userEvent.setup();
    const auth = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-a',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
      signOutError: new AuthenticationError('network-unavailable', 'Unable to sign out.'),
    });
    const { screen } = await renderProfileStack({ auth });

    await user.press(screen.getByTestId('profile-home-settings'));
    await user.press(await screen.findByTestId('settings-sign-out'));

    const errorStyle = flattenStyle(await screen.findByTestId('settings-sign-out-error'));
    expect(errorStyle.color).toBe(colors.danger);
    expect(errorStyle.color).not.toBe(colors.accent);
    expect(errorStyle.color).not.toBe(colors.authAccent);
  });

  it('keeps About on the product canvas with the real app version', async () => {
    const user = userEvent.setup();
    const { screen } = await renderProfileStack();

    await user.press(screen.getByTestId('profile-home-settings'));
    await user.press(await screen.findByTestId('settings-about'));

    const canvas = flattenStyle(await screen.findByTestId('about-canvas'));
    expect(canvas.backgroundColor).toBe(colors.background);
    expect(AUTH_CANVAS_COLORS).not.toContain(canvas.backgroundColor);
    expect(screen.getByTestId('about-app-name')).toBeTruthy();
    expect(screen.getByTestId('about-version')).toBeTruthy();
  });

  it('renders Edit Name as a Product Mode form, not Auth Brand Mode', async () => {
    const user = userEvent.setup();
    const { screen } = await renderProfileStack();

    await user.press(screen.getByTestId('profile-home-settings'));
    await user.press(await screen.findByTestId('settings-edit-name'));

    const supporting = await screen.findByTestId('edit-name-supporting');
    expectProductCanvas(supporting);
    const supportingStyle = flattenStyle(supporting);
    expect(supportingStyle.fontFamily).toBe(typography.bodySecondary.fontFamily);
    expect(supportingStyle.fontSize).toBe(typography.bodySecondary.fontSize);
    expect(supportingStyle.color).toBe(colors.textSecondary);

    const firstNameLabel = flattenStyle(screen.getByText(quizzerProfileCopy.name.firstName));
    expect(firstNameLabel.fontFamily).toBe(typography.label.fontFamily);
    expect(firstNameLabel.fontSize).toBe(typography.label.fontSize);

    expectProductFieldChrome(screen.getByTestId('edit-name-first'));
    expectProductFieldChrome(screen.getByTestId('edit-name-last'));
    expectProductPrimaryButton(screen.getByTestId('edit-name-save'));
  });

  it('renders Change Email form and success on the Product canvas with danger errors', async () => {
    const user = userEvent.setup();
    const auth = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-a',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
      changeEmailError: new AuthenticationError(
        'requires-recent-login',
        'For security, enter your current password and try again.',
      ),
    });
    const { screen } = await renderProfileStack({ auth });

    await user.press(screen.getByTestId('profile-home-settings'));
    await user.press(await screen.findByTestId('settings-change-email'));

    const supporting = await screen.findByTestId('change-email-supporting');
    expectProductCanvas(supporting);
    expect(flattenStyle(supporting).color).toBe(colors.textSecondary);
    expectProductFieldChrome(screen.getByTestId('change-email-new'));
    expectProductFieldChrome(screen.getByTestId('change-email-password'));
    expectProductPrimaryButton(screen.getByTestId('change-email-submit'));

    await user.type(screen.getByTestId('change-email-new'), 'new@example.com');
    await user.type(screen.getByTestId('change-email-password'), 'secret');
    await user.press(screen.getByTestId('change-email-submit'));

    const errorStyle = flattenStyle(await screen.findByTestId('change-email-error'));
    expect(errorStyle.color).toBe(colors.danger);
    expect(errorStyle.color).not.toBe(colors.accent);
    expect(errorStyle.color).not.toBe(colors.authAccent);
  });

  it('keeps Change Email success on Product Mode after verification is sent', async () => {
    const user = userEvent.setup();
    const { screen } = await renderProfileStack();

    await user.press(screen.getByTestId('profile-home-settings'));
    await user.press(await screen.findByTestId('settings-change-email'));
    await user.type(await screen.findByTestId('change-email-new'), 'new@example.com');
    await user.type(screen.getByTestId('change-email-password'), 'secret');
    await user.press(screen.getByTestId('change-email-submit'));

    const successTitle = await screen.findByTestId('change-email-success-title');
    expectProductCanvas(successTitle);
    const titleStyle = flattenStyle(successTitle);
    expect(titleStyle.fontFamily).toBe(typography.sectionTitle.fontFamily);
    expect(titleStyle.fontSize).toBe(typography.sectionTitle.fontSize);
    expect(titleStyle.color).toBe(colors.textPrimary);
    expectProductPrimaryButton(screen.getByTestId('change-email-done'));
  });

  it('renders Change Password form, errors, and success in Product Mode', async () => {
    const user = userEvent.setup();
    const auth = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-a',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
      changePasswordError: new AuthenticationError(
        'requires-recent-login',
        'For security, enter your current password and try again.',
      ),
    });
    const { screen } = await renderProfileStack({ auth });

    await user.press(screen.getByTestId('profile-home-settings'));
    await user.press(await screen.findByTestId('settings-change-password'));

    const supporting = await screen.findByTestId('change-password-supporting');
    expectProductCanvas(supporting);
    expect(flattenStyle(supporting).color).toBe(colors.textSecondary);
    expectProductFieldChrome(screen.getByTestId('change-password-current'));
    expectProductFieldChrome(screen.getByTestId('change-password-new'));
    expectProductFieldChrome(screen.getByTestId('change-password-confirm'));
    expectProductPrimaryButton(screen.getByTestId('change-password-submit'));

    await user.type(screen.getByTestId('change-password-current'), 'old-secret');
    await user.type(screen.getByTestId('change-password-new'), 'new-secret');
    await user.type(screen.getByTestId('change-password-confirm'), 'new-secret');
    await user.press(screen.getByTestId('change-password-submit'));

    const error = await screen.findByTestId('change-password-error');
    expect(error.props.accessibilityRole).toBe('alert');
    expect(error.props.accessibilityLiveRegion).toBe('polite');
    const errorStyle = flattenStyle(error);
    expect(errorStyle.color).toBe(colors.danger);
    expect(errorStyle.color).not.toBe(colors.accent);
    expect(errorStyle.color).not.toBe(colors.authAccent);
  });

  it('keeps Change Password success on Product Mode', async () => {
    const user = userEvent.setup();
    const { screen } = await renderProfileStack();

    await user.press(screen.getByTestId('profile-home-settings'));
    await user.press(await screen.findByTestId('settings-change-password'));
    await user.type(await screen.findByTestId('change-password-current'), 'old-secret');
    await user.type(screen.getByTestId('change-password-new'), 'new-secret');
    await user.type(screen.getByTestId('change-password-confirm'), 'new-secret');
    await user.press(screen.getByTestId('change-password-submit'));

    const successTitle = await screen.findByTestId('change-password-success-title');
    expectProductCanvas(successTitle);
    const titleStyle = flattenStyle(successTitle);
    expect(titleStyle.fontFamily).toBe(typography.sectionTitle.fontFamily);
    expect(titleStyle.color).toBe(colors.textPrimary);
    expectProductPrimaryButton(screen.getByTestId('change-password-done'));
  });
});
