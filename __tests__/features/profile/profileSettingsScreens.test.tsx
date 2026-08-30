import { NavigationContainer } from '@react-navigation/native';
import { render, userEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import { AuthenticationError, AuthProvider } from '../../../src/features/auth';
import { authCopy } from '../../../src/features/auth/copy/authCopy';
import { QuizzerProfileError } from '../../../src/features/profile';
import { quizzerProfileCopy } from '../../../src/features/profile/copy/quizzerProfileCopy';
import { ProfileStackNavigator } from '../../../src/features/profile/navigation/ProfileStackNavigator';
import { QuizzerProfileProvider } from '../../../src/features/profile/state/QuizzerProfileProvider';
import { getAppVersion } from '../../../src/features/profile/utils/getAppVersion';
import { createAuthRepositoryFake } from '../../../test-utils/authRepositoryFake';
import { createQuizzerProfileRepositoryFake } from '../../../test-utils/quizzerProfileRepositoryFake';

async function renderProfileStack(options?: {
  auth?: ReturnType<typeof createAuthRepositoryFake>;
  profiles?: ReturnType<typeof createQuizzerProfileRepositoryFake>;
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
  const profiles = options?.profiles ?? createQuizzerProfileRepositoryFake();
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

  return { screen, auth, profiles };
}

describe('Profile + Settings foundation', () => {
  it('renders full name and initials without streak/analytics copy', async () => {
    const { screen } = await renderProfileStack();

    expect(screen.getByTestId('profile-home-full-name').props.children).toBe('Ada Lovelace');
    expect(screen.getByTestId('quizzer-avatar-initials').props.children).toBe('AL');
    expect(screen.queryByText(/streak/i)).toBeNull();
    expect(screen.queryByText(/analytics/i)).toBeNull();
  });

  it('opens Settings and routes to working rows', async () => {
    const user = userEvent.setup();
    const { screen } = await renderProfileStack();

    await user.press(screen.getByTestId('profile-home-settings'));
    expect(await screen.findByTestId('settings-email')).toBeTruthy();
    expect(screen.getByText('quizzer@example.com')).toBeTruthy();

    await user.press(screen.getByTestId('settings-edit-name'));
    expect(await screen.findByTestId('edit-name-first')).toBeTruthy();
  });

  it('opens Help & Feedback from Settings', async () => {
    const user = userEvent.setup();
    const { screen } = await renderProfileStack();

    await user.press(screen.getByTestId('profile-home-settings'));
    await user.press(await screen.findByTestId('settings-help-feedback'));
    expect(await screen.findByTestId('help-feedback-supporting')).toBeTruthy();
    expect(screen.getByTestId('help-feedback-bug')).toBeTruthy();
    expect(screen.getByTestId('help-feedback-feature')).toBeTruthy();
    expect(screen.getByTestId('help-feedback-general')).toBeTruthy();
  });

  it('prefills Edit Name and updates via provider', async () => {
    const user = userEvent.setup();
    const { screen, profiles } = await renderProfileStack();

    await user.press(screen.getByTestId('profile-home-settings'));
    await user.press(await screen.findByTestId('settings-edit-name'));

    const first = await screen.findByTestId('edit-name-first');
    expect(first.props.value).toBe('Ada');

    await user.clear(first);
    await user.type(first, 'Augusta');
    await user.press(screen.getByTestId('edit-name-save'));

    await waitFor(() => {
      expect(profiles.updateName).toHaveBeenCalledWith({
        quizzerId: 'user-a',
        firstName: 'Augusta',
        lastName: 'Lovelace',
      });
    });
  });

  it('Change Email shows verification-sent success without claiming email already changed', async () => {
    const user = userEvent.setup();
    const { screen, auth } = await renderProfileStack();

    await user.press(screen.getByTestId('profile-home-settings'));
    await user.press(await screen.findByTestId('settings-change-email'));

    await user.type(await screen.findByTestId('change-email-new'), 'new@example.com');
    await user.type(screen.getByTestId('change-email-password'), 'secret');
    await user.press(screen.getByTestId('change-email-submit'));

    expect(await screen.findByTestId('change-email-success-title')).toBeTruthy();
    expect(screen.getByText(quizzerProfileCopy.changeEmail.successBody)).toBeTruthy();
    expect(auth.changeEmail).toHaveBeenCalledWith({
      newEmail: 'new@example.com',
      currentPassword: 'secret',
    });
  });

  it('signs out from Settings', async () => {
    const user = userEvent.setup();
    const { screen, auth } = await renderProfileStack();

    await user.press(screen.getByTestId('profile-home-settings'));
    await user.press(await screen.findByTestId('settings-sign-out'));

    await waitFor(() => {
      expect(auth.signOut).toHaveBeenCalled();
    });
  });

  it('About shows app version from app.json', async () => {
    const user = userEvent.setup();
    const { screen } = await renderProfileStack();

    await user.press(screen.getByTestId('profile-home-settings'));
    await user.press(await screen.findByTestId('settings-about'));

    expect(await screen.findByTestId('about-version')).toHaveTextContent(
      `Version ${getAppVersion()}`,
    );
  });

  it('Edit Name failure stays on screen and keeps prior profile', async () => {
    const user = userEvent.setup();
    const profiles = createQuizzerProfileRepositoryFake({
      updateNameError: new QuizzerProfileError(
        'unavailable',
        'Unable to load or save profile.',
      ),
    });
    const { screen, profiles: profileRepo } = await renderProfileStack({ profiles });

    await user.press(screen.getByTestId('profile-home-settings'));
    await user.press(await screen.findByTestId('settings-edit-name'));

    const first = await screen.findByTestId('edit-name-first');
    await user.clear(first);
    await user.type(first, 'Augusta');
    await user.press(screen.getByTestId('edit-name-save'));

    expect(await screen.findByText('Unable to load or save profile.')).toBeTruthy();
    expect(screen.getByTestId('edit-name-save')).toBeTruthy();
    expect(screen.queryByTestId('settings-email')).toBeNull();
    await expect(profileRepo.getProfile('user-a')).resolves.toMatchObject({
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
  });

  it('Change Password validates fields and calls auth on success', async () => {
    const user = userEvent.setup();
    const { screen, auth } = await renderProfileStack();

    await user.press(screen.getByTestId('profile-home-settings'));
    await user.press(await screen.findByTestId('settings-change-password'));

    await user.press(await screen.findByTestId('change-password-submit'));
    expect(
      await screen.findAllByText(authCopy.validation.passwordRequired),
    ).toHaveLength(2);
    expect(
      await screen.findByText(authCopy.validation.confirmPasswordRequired),
    ).toBeTruthy();
    expect(auth.changePassword).not.toHaveBeenCalled();

    await user.type(screen.getByTestId('change-password-current'), 'old-secret');
    await user.type(screen.getByTestId('change-password-new'), 'new-secret');
    await user.type(screen.getByTestId('change-password-confirm'), 'mismatch');
    await user.press(screen.getByTestId('change-password-submit'));
    expect(await screen.findByText(authCopy.validation.passwordMismatch)).toBeTruthy();
    expect(auth.changePassword).not.toHaveBeenCalled();

    await user.clear(screen.getByTestId('change-password-confirm'));
    await user.type(screen.getByTestId('change-password-confirm'), 'new-secret');
    await user.press(screen.getByTestId('change-password-submit'));

    expect(await screen.findByTestId('change-password-success-title')).toBeTruthy();
    expect(auth.changePassword).toHaveBeenCalledWith({
      currentPassword: 'old-secret',
      newPassword: 'new-secret',
    });
    expect(auth.changePassword).toHaveBeenCalledTimes(1);
  });

  it('Change Password ignores duplicate submit while in flight', async () => {
    const user = userEvent.setup();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const auth = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-a',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    (auth.changePassword as jest.Mock).mockImplementation(async () => {
      await gate;
    });
    const { screen } = await renderProfileStack({ auth });

    await user.press(screen.getByTestId('profile-home-settings'));
    await user.press(await screen.findByTestId('settings-change-password'));
    await user.type(await screen.findByTestId('change-password-current'), 'old-secret');
    await user.type(screen.getByTestId('change-password-new'), 'new-secret');
    await user.type(screen.getByTestId('change-password-confirm'), 'new-secret');

    await user.press(screen.getByTestId('change-password-submit'));
    await user.press(screen.getByTestId('change-password-submit'));
    release();

    expect(await screen.findByTestId('change-password-success-title')).toBeTruthy();
    expect(auth.changePassword).toHaveBeenCalledTimes(1);
  });

  it('Change Password failure stays on screen with translated error', async () => {
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

    await user.type(await screen.findByTestId('change-password-current'), 'old-secret');
    await user.type(screen.getByTestId('change-password-new'), 'new-secret');
    await user.type(screen.getByTestId('change-password-confirm'), 'new-secret');
    await user.press(screen.getByTestId('change-password-submit'));

    expect(await screen.findByTestId('change-password-error')).toHaveTextContent(
      'For security, enter your current password and try again.',
    );
    expect(screen.getByTestId('change-password-submit')).toBeTruthy();
    expect(screen.queryByTestId('change-password-success-title')).toBeNull();
  });

  it('Change Email shows recent-login failure from auth layer', async () => {
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

    await user.type(await screen.findByTestId('change-email-new'), 'new@example.com');
    await user.type(screen.getByTestId('change-email-password'), 'secret');
    await user.press(screen.getByTestId('change-email-submit'));

    expect(await screen.findByTestId('change-email-error')).toHaveTextContent(
      'For security, enter your current password and try again.',
    );
    expect(screen.queryByTestId('change-email-success-title')).toBeNull();
  });

  it('Change Password fields use secure text entry', async () => {
    const user = userEvent.setup();
    const { screen } = await renderProfileStack();

    await user.press(screen.getByTestId('profile-home-settings'));
    await user.press(await screen.findByTestId('settings-change-password'));

    expect((await screen.findByTestId('change-password-current')).props.secureTextEntry).toBe(
      true,
    );
    expect(screen.getByTestId('change-password-new').props.secureTextEntry).toBe(true);
    expect(screen.getByTestId('change-password-confirm').props.secureTextEntry).toBe(true);
  });
});
