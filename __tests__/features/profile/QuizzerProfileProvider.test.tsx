import { act, fireEvent, render, userEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { AuthProvider } from '../../../src/features/auth';
import { QuizzerProfileError } from '../../../src/features/profile';
import { quizzerProfileCopy } from '../../../src/features/profile/copy/quizzerProfileCopy';
import { QuizzerNameScreen } from '../../../src/features/profile/screens/QuizzerNameScreen';
import { QuizzerProfileLoadErrorScreen } from '../../../src/features/profile/screens/QuizzerProfileLoadErrorScreen';
import {
  QuizzerProfileProvider,
  useQuizzerProfile,
} from '../../../src/features/profile/state/QuizzerProfileProvider';
import { createAuthRepositoryFake } from '../../../test-utils/authRepositoryFake';
import { createQuizzerProfileRepositoryFake } from '../../../test-utils/quizzerProfileRepositoryFake';

function ProfileStatusProbe(): React.JSX.Element {
  const { session } = useQuizzerProfile();
  return (
    <View>
      <Text testID="profile-status">{session.status}</Text>
      {session.status === 'ready' ? (
        <Text testID="profile-quizzer-id">{session.quizzerId}</Text>
      ) : null}
      {session.status === 'ready' ? (
        <Text testID="profile-first-name">{session.profile.firstName}</Text>
      ) : null}
      {session.status === 'error' ? (
        <Text testID="profile-error-code">{session.error.code}</Text>
      ) : null}
      {session.status === 'missing' ||
      session.status === 'loading' ||
      session.status === 'error' ||
      session.status === 'ready' ? (
        <Text testID="profile-scoped-id">{session.quizzerId}</Text>
      ) : null}
    </View>
  );
}

function ProvisionOwnershipProbe(): React.JSX.Element {
  const { provisionProfile, session } = useQuizzerProfile();
  return (
    <View>
      <Text testID="profile-status">{session.status}</Text>
      <Text
        testID="provision-trigger"
        onPress={() => {
          void provisionProfile({ firstName: 'Ada', lastName: 'Lovelace' });
        }}
      >
        Provision
      </Text>
    </View>
  );
}

async function renderWithProviders(
  ui: React.ReactElement,
  options: {
    auth: ReturnType<typeof createAuthRepositoryFake>;
    profiles: ReturnType<typeof createQuizzerProfileRepositoryFake>;
  },
) {
  return render(
    <AuthProvider repository={options.auth}>
      <QuizzerProfileProvider repository={options.profiles}>{ui}</QuizzerProfileProvider>
    </AuthProvider>,
  );
}

describe('QuizzerProfileProvider resolution', () => {
  it('resolves missing when getProfile returns null', async () => {
    const auth = createAuthRepositoryFake({
      initialIdentity: { uid: 'user-a', email: 'a@example.com', emailVerified: false },
    });
    const profiles = createQuizzerProfileRepositoryFake();

    const screen = await renderWithProviders(<ProfileStatusProbe />, { auth, profiles });

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('missing');
    });
    expect(screen.getByTestId('profile-scoped-id').props.children).toBe('user-a');
    expect(profiles.getProfile).toHaveBeenCalledWith('user-a');
  });

  it('resolves ready when getProfile returns a profile', async () => {
    const auth = createAuthRepositoryFake({
      initialIdentity: { uid: 'user-a', email: 'a@example.com', emailVerified: false },
    });
    const profiles = createQuizzerProfileRepositoryFake();
    profiles.seed({
      quizzerId: 'user-a',
      firstName: 'Taylor',
      lastName: 'Quizzer',
      avatarId: null,
    });

    const screen = await renderWithProviders(<ProfileStatusProbe />, { auth, profiles });

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('ready');
    });
    expect(screen.getByTestId('profile-first-name').props.children).toBe('Taylor');
  });

  it('resolves error when getProfile throws and retry reloads', async () => {
    const auth = createAuthRepositoryFake({
      initialIdentity: { uid: 'user-a', email: 'a@example.com', emailVerified: false },
    });
    const profiles = createQuizzerProfileRepositoryFake({
      getError: new QuizzerProfileError('unavailable', 'Profile is temporarily unavailable.'),
    });

    const screen = await renderWithProviders(
      <>
        <ProfileStatusProbe />
        <QuizzerProfileLoadErrorScreen />
      </>,
      { auth, profiles },
    );

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('error');
    });
    expect(screen.getByTestId('quizzer-profile-load-error-title')).toBeTruthy();
    expect(screen.queryByTestId('quizzer-name-title')).toBeNull();

    (profiles.getProfile as jest.Mock).mockImplementation(async () => null);

    fireEvent.press(screen.getByTestId('quizzer-profile-load-error-retry'));

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('missing');
    });
  });

  it('signs out from profile load error recovery', async () => {
    const user = userEvent.setup();
    const auth = createAuthRepositoryFake({
      initialIdentity: { uid: 'user-a', email: 'a@example.com', emailVerified: false },
    });
    const profiles = createQuizzerProfileRepositoryFake({
      getError: new QuizzerProfileError('unavailable', 'Profile is temporarily unavailable.'),
    });

    const screen = await renderWithProviders(
      <>
        <ProfileStatusProbe />
        <QuizzerProfileLoadErrorScreen />
      </>,
      { auth, profiles },
    );

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('error');
    });

    await user.press(screen.getByTestId('quizzer-profile-load-error-sign-out'));

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('idle');
    });
    expect(auth.signOut).toHaveBeenCalled();
  });
});

describe('QuizzerProfileProvider auth lifecycle', () => {
  it('clears to idle on sign out', async () => {
    const auth = createAuthRepositoryFake({
      initialIdentity: { uid: 'user-a', email: 'a@example.com', emailVerified: false },
    });
    const profiles = createQuizzerProfileRepositoryFake();
    profiles.seed({
      quizzerId: 'user-a',
      firstName: 'Taylor',
      lastName: 'Quizzer',
      avatarId: null,
    });

    const screen = await renderWithProviders(<ProfileStatusProbe />, { auth, profiles });

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('ready');
    });

    await act(async () => {
      await auth.signOut();
    });

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('idle');
    });
  });

  it('does not expose user A profile after switching to user B', async () => {
    let releaseA: (profile: null) => void = () => undefined;
    const pendingA = new Promise<null>((resolve) => {
      releaseA = resolve;
    });

    const auth = createAuthRepositoryFake({
      initialIdentity: { uid: 'user-a', email: 'a@example.com', emailVerified: false },
    });
    const profiles = createQuizzerProfileRepositoryFake();

    (profiles.getProfile as jest.Mock).mockImplementation(async (quizzerId: string) => {
      if (quizzerId === 'user-a') {
        return pendingA;
      }
      return {
        quizzerId: 'user-b',
        firstName: 'Bailey',
        lastName: 'Quizzer',
        avatarId: null,
      };
    });

    const screen = await renderWithProviders(<ProfileStatusProbe />, { auth, profiles });

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('loading');
    });

    await act(async () => {
      auth.emit({ uid: 'user-b', email: 'b@example.com', emailVerified: false });
    });

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('ready');
    });
    expect(screen.getByTestId('profile-quizzer-id').props.children).toBe('user-b');
    expect(screen.getByTestId('profile-first-name').props.children).toBe('Bailey');

    await act(async () => {
      releaseA(null);
    });

    expect(screen.getByTestId('profile-status').props.children).toBe('ready');
    expect(screen.getByTestId('profile-quizzer-id').props.children).toBe('user-b');
  });
});

describe('QuizzerNameScreen provisioning', () => {
  it('provisions with the authenticated uid and becomes ready', async () => {
    const user = userEvent.setup();
    const auth = createAuthRepositoryFake({
      initialIdentity: { uid: 'user-a', email: 'a@example.com', emailVerified: false },
    });
    const profiles = createQuizzerProfileRepositoryFake();

    const screen = await renderWithProviders(
      <>
        <ProfileStatusProbe />
        <QuizzerNameScreen />
      </>,
      { auth, profiles },
    );

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('missing');
    });

    await user.type(screen.getByTestId('quizzer-name-first'), '  Ada  ');
    await user.type(screen.getByTestId('quizzer-name-last'), 'Lovelace');
    await user.press(screen.getByTestId('quizzer-name-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('ready');
    });
    expect(profiles.provisionProfile).toHaveBeenCalledWith({
      quizzerId: 'user-a',
      firstName: 'Ada',
      lastName: 'Lovelace',
      avatarId: null,
    });
    expect(screen.getByTestId('profile-first-name').props.children).toBe('Ada');
  });

  it('stays on name onboarding when provision fails', async () => {
    const user = userEvent.setup();
    const auth = createAuthRepositoryFake({
      initialIdentity: { uid: 'user-a', email: 'a@example.com', emailVerified: false },
    });
    const profiles = createQuizzerProfileRepositoryFake({
      provisionError: new QuizzerProfileError(
        'unavailable',
        'Profile is temporarily unavailable.',
      ),
    });

    const screen = await renderWithProviders(
      <>
        <ProfileStatusProbe />
        <QuizzerNameScreen />
      </>,
      { auth, profiles },
    );

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('missing');
    });

    await user.type(screen.getByTestId('quizzer-name-first'), 'Ada');
    await user.type(screen.getByTestId('quizzer-name-last'), 'Lovelace');
    await user.press(screen.getByTestId('quizzer-name-submit'));

    expect(await screen.findByText('Profile is temporarily unavailable.')).toBeTruthy();
    expect(screen.getByTestId('profile-status').props.children).toBe('missing');
    expect(screen.getByTestId('quizzer-name-title')).toBeTruthy();
  });

  it('signs out from name onboarding', async () => {
    const user = userEvent.setup();
    const auth = createAuthRepositoryFake({
      initialIdentity: { uid: 'user-a', email: 'a@example.com', emailVerified: false },
    });
    const profiles = createQuizzerProfileRepositoryFake();

    const screen = await renderWithProviders(
      <>
        <ProfileStatusProbe />
        <QuizzerNameScreen />
      </>,
      { auth, profiles },
    );

    expect(await screen.findByTestId('quizzer-name-title')).toBeTruthy();

    await user.press(screen.getByTestId('quizzer-name-sign-out'));

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('idle');
    });
    expect(auth.signOut).toHaveBeenCalled();
  });

  it('never lets callers choose quizzerId for provisionProfile', async () => {
    const user = userEvent.setup();
    const auth = createAuthRepositoryFake({
      initialIdentity: { uid: 'auth-uid', email: 'a@example.com', emailVerified: false },
    });
    const profiles = createQuizzerProfileRepositoryFake();

    const screen = await renderWithProviders(<ProvisionOwnershipProbe />, { auth, profiles });

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('missing');
    });

    await user.press(screen.getByTestId('provision-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('ready');
    });
    expect(profiles.provisionProfile).toHaveBeenCalledWith(
      expect.objectContaining({ quizzerId: 'auth-uid' }),
    );
    expect(profiles.provisionProfile).not.toHaveBeenCalledWith(
      expect.objectContaining({ quizzerId: 'attacker-uid' }),
    );
  });
});

describe('QuizzerNameScreen validation', () => {
  it('requires first and last name before provisioning', async () => {
    const user = userEvent.setup();
    const auth = createAuthRepositoryFake({
      initialIdentity: { uid: 'user-a', email: 'a@example.com', emailVerified: false },
    });
    const profiles = createQuizzerProfileRepositoryFake();

    const screen = await renderWithProviders(<QuizzerNameScreen />, { auth, profiles });

    expect(await screen.findByTestId('quizzer-name-submit')).toBeTruthy();

    await user.press(screen.getByTestId('quizzer-name-submit'));

    expect(await screen.findByText(quizzerProfileCopy.name.firstNameRequired)).toBeTruthy();
    expect(screen.getByText(quizzerProfileCopy.name.lastNameRequired)).toBeTruthy();
    expect(profiles.provisionProfile).not.toHaveBeenCalled();
  });

  it('accepts Unicode names after trim', async () => {
    const user = userEvent.setup();
    const auth = createAuthRepositoryFake({
      initialIdentity: { uid: 'user-a', email: 'a@example.com', emailVerified: false },
    });
    const profiles = createQuizzerProfileRepositoryFake();

    const screen = await renderWithProviders(
      <>
        <ProfileStatusProbe />
        <QuizzerNameScreen />
      </>,
      { auth, profiles },
    );

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('missing');
    });

    await user.type(screen.getByTestId('quizzer-name-first'), '  太郎  ');
    await user.type(screen.getByTestId('quizzer-name-last'), 'José');
    await user.press(screen.getByTestId('quizzer-name-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('ready');
    });
    expect(profiles.provisionProfile).toHaveBeenCalledWith({
      quizzerId: 'user-a',
      firstName: '太郎',
      lastName: 'José',
      avatarId: null,
    });
  });
});
