import { act, fireEvent, render, userEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { AuthProvider, useAuth } from '../../../src/features/auth';
import { QuizzerProfileError } from '../../../src/features/profile';
import { quizzerProfileCopy } from '../../../src/features/profile/copy/quizzerProfileCopy';
import { QuizzerNameScreen } from '../../../src/features/profile/screens/QuizzerNameScreen';
import { QuizzerProfileLoadErrorScreen } from '../../../src/features/profile/screens/QuizzerProfileLoadErrorScreen';
import {
  QuizzerProfileProvider,
  useQuizzerProfile,
} from '../../../src/features/profile/state/QuizzerProfileProvider';
import { isolateQuizzerProfileSessionForUid } from '../../../src/features/profile/state/quizzerProfileSessionState';
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

  it('does not expose user A ready/missing/error on the first paint after switching to user B', async () => {
    let releaseB: (profile: {
      quizzerId: string;
      firstName: string;
      lastName: string;
      avatarId: null;
    }) => void = () => undefined;
    const pendingB = new Promise<{
      quizzerId: string;
      firstName: string;
      lastName: string;
      avatarId: null;
    }>((resolve) => {
      releaseB = resolve;
    });

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

    (profiles.getProfile as jest.Mock).mockImplementation(async (quizzerId: string) => {
      if (quizzerId === 'user-a') {
        return {
          quizzerId: 'user-a',
          firstName: 'Taylor',
          lastName: 'Quizzer',
          avatarId: null,
        };
      }
      return pendingB;
    });

    const screen = await renderWithProviders(<ProfileStatusProbe />, { auth, profiles });

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('ready');
    });
    expect(screen.getByTestId('profile-quizzer-id').props.children).toBe('user-a');

    await act(async () => {
      auth.emit({ uid: 'user-b', email: 'b@example.com', emailVerified: false });
    });

    expect(screen.getByTestId('profile-status').props.children).not.toBe('ready');
    expect(screen.getByTestId('profile-status').props.children).not.toBe('missing');
    expect(screen.getByTestId('profile-status').props.children).not.toBe('error');
    expect(screen.queryByTestId('profile-first-name')).toBeNull();
    expect(screen.getByTestId('profile-scoped-id').props.children).toBe('user-b');

    await act(async () => {
      releaseB({
        quizzerId: 'user-b',
        firstName: 'Bailey',
        lastName: 'Quizzer',
        avatarId: null,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('ready');
    });
    expect(screen.getByTestId('profile-quizzer-id').props.children).toBe('user-b');
  });

  it('same uid with refreshed email does not reload profile', async () => {
    const auth = createAuthRepositoryFake({
      initialIdentity: { uid: 'user-a', email: 'old@example.com', emailVerified: false },
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
    expect(profiles.getProfile).toHaveBeenCalledTimes(1);

    await act(async () => {
      auth.emit({ uid: 'user-a', email: 'new@example.com', emailVerified: false });
    });

    expect(screen.getByTestId('profile-status').props.children).toBe('ready');
    expect(screen.getByTestId('profile-first-name').props.children).toBe('Taylor');
    expect(profiles.getProfile).toHaveBeenCalledTimes(1);
  });

  it('same uid with refreshed emailVerified does not reload profile', async () => {
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
    expect(profiles.getProfile).toHaveBeenCalledTimes(1);

    await act(async () => {
      auth.emit({ uid: 'user-a', email: 'a@example.com', emailVerified: true });
    });

    expect(screen.getByTestId('profile-status').props.children).toBe('ready');
    expect(profiles.getProfile).toHaveBeenCalledTimes(1);
  });

  it('refreshIdentity for same uid does not transition to loading', async () => {
    const user = userEvent.setup();
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

    function RefreshProbe(): React.JSX.Element {
      const { refreshIdentity } = useAuth();
      const { session } = useQuizzerProfile();
      return (
        <>
          <Text testID="profile-status">{session.status}</Text>
          <Pressable
            testID="refresh-identity"
            onPress={() => {
              void refreshIdentity();
            }}
          />
        </>
      );
    }

    const screen = await renderWithProviders(<RefreshProbe />, { auth, profiles });

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('ready');
    });
    const callsBefore = (profiles.getProfile as jest.Mock).mock.calls.length;

    await user.press(screen.getByTestId('refresh-identity'));

    expect(screen.getByTestId('profile-status').props.children).toBe('ready');
    expect(profiles.getProfile).toHaveBeenCalledTimes(callsBefore);
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

  it('updateName uses auth uid and refreshes ready profile without optimism', async () => {
    const user = userEvent.setup();
    const auth = createAuthRepositoryFake({
      initialIdentity: { uid: 'auth-uid', email: 'a@example.com', emailVerified: false },
    });
    const profiles = createQuizzerProfileRepositoryFake();
    profiles.seed({
      quizzerId: 'auth-uid',
      firstName: 'Old',
      lastName: 'Name',
      avatarId: 'preset-a',
    });

    function UpdateNameProbe(): React.JSX.Element {
      const { session, updateName } = useQuizzerProfile();
      return (
        <>
          <Text testID="profile-status">{session.status}</Text>
          <Text testID="profile-first">
            {session.status === 'ready' ? session.profile.firstName : ''}
          </Text>
          <Text testID="profile-avatar">
            {session.status === 'ready' ? String(session.profile.avatarId) : ''}
          </Text>
          <Pressable
            testID="update-name-trigger"
            onPress={() => {
              void updateName({ firstName: 'New', lastName: 'Name' });
            }}
          />
        </>
      );
    }

    const screen = await renderWithProviders(<UpdateNameProbe />, { auth, profiles });

    await waitFor(() => {
      expect(screen.getByTestId('profile-status').props.children).toBe('ready');
    });
    expect(screen.getByTestId('profile-first').props.children).toBe('Old');

    await user.press(screen.getByTestId('update-name-trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('profile-first').props.children).toBe('New');
    });
    expect(screen.getByTestId('profile-avatar').props.children).toBe('preset-a');
    expect(profiles.updateName).toHaveBeenCalledWith({
      quizzerId: 'auth-uid',
      firstName: 'New',
      lastName: 'Name',
    });
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

describe('isolateQuizzerProfileSessionForUid', () => {
  const readyA = {
    status: 'ready' as const,
    quizzerId: 'user-a',
    profile: {
      quizzerId: 'user-a',
      firstName: 'Taylor',
      lastName: 'Quizzer',
      avatarId: null,
    },
  };
  const missingA = { status: 'missing' as const, quizzerId: 'user-a' };
  const errorA = {
    status: 'error' as const,
    quizzerId: 'user-a',
    error: new QuizzerProfileError('unavailable', 'Profile is temporarily unavailable.'),
  };

  it('exposes idle when signed out, even if a ready session is still in memory', () => {
    expect(isolateQuizzerProfileSessionForUid(readyA, null)).toEqual({ status: 'idle' });
  });

  it('does not surface mismatched ready/missing/error for the current uid', () => {
    expect(isolateQuizzerProfileSessionForUid(readyA, 'user-b')).toEqual({
      status: 'loading',
      quizzerId: 'user-b',
    });
    expect(isolateQuizzerProfileSessionForUid(missingA, 'user-b')).toEqual({
      status: 'loading',
      quizzerId: 'user-b',
    });
    expect(isolateQuizzerProfileSessionForUid(errorA, 'user-b')).toEqual({
      status: 'loading',
      quizzerId: 'user-b',
    });
  });

  it('passes through a session that already matches the current uid', () => {
    expect(isolateQuizzerProfileSessionForUid(readyA, 'user-a')).toBe(readyA);
    expect(isolateQuizzerProfileSessionForUid({ status: 'idle' }, 'user-a')).toEqual({
      status: 'idle',
    });
  });
});
