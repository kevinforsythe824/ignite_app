import { act, render, userEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo } from 'react-native';

import { RootNavigator } from '../../../src/app/navigation/RootNavigator';
import { AuthProvider } from '../../../src/features/auth';
import { authCopy } from '../../../src/features/auth/copy/authCopy';
import { IgniteEntryScreen } from '../../../src/features/auth/screens/IgniteEntryScreen';
import { QuizzerProfileError } from '../../../src/features/profile';
import { QuizzerProfileProvider } from '../../../src/features/profile/state/QuizzerProfileProvider';
import { createAuthRepositoryFake } from '../../../test-utils/authRepositoryFake';
import { createQuizzerProfileRepositoryFake } from '../../../test-utils/quizzerProfileRepositoryFake';

jest.mock('../../../src/features/flashcards/repositories/firebaseCurriculumSource', () => {
  const { jsonCurriculumRepository } = jest.requireActual(
    '../../../src/features/flashcards/repositories/jsonCurriculumRepository',
  ) as typeof import('../../../src/features/flashcards/repositories/jsonCurriculumRepository');

  return {
    createFirebaseCurriculumSource: jest.fn(),
    firestoreCurriculumRepository: jsonCurriculumRepository,
  };
});

async function renderRoot(
  repository: ReturnType<typeof createAuthRepositoryFake>,
  profileRepository: ReturnType<typeof createQuizzerProfileRepositoryFake> = createQuizzerProfileRepositoryFake(),
) {
  return render(
    <AuthProvider repository={repository}>
      <QuizzerProfileProvider repository={profileRepository}>
        <RootNavigator />
      </QuizzerProfileProvider>
    </AuthProvider>,
  );
}

describe('RootNavigator auth session switch', () => {
  it('shows Ignite Entry while initializing and does not flash Welcome', async () => {
    const repository = createAuthRepositoryFake({ emitOnSubscribe: false });
    const screen = await renderRoot(repository);

    expect(screen.getByLabelText(authCopy.brand.accessibilityLabel)).toBeTruthy();
    expect(screen.queryByTestId('auth-welcome-create-account')).toBeNull();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
  });

  it('shows Welcome only after unauthenticated resolution', async () => {
    const repository = createAuthRepositoryFake({ emitOnSubscribe: false });
    const screen = await renderRoot(repository);

    expect(screen.queryByTestId('auth-welcome-create-account')).toBeNull();

    await act(async () => {
      repository.emit(null);
    });

    expect(await screen.findByTestId('auth-welcome-create-account')).toBeTruthy();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
  });

  it('shows the authenticated app without Welcome', async () => {
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const profileRepository = createQuizzerProfileRepositoryFake();
    profileRepository.seed({
      quizzerId: 'user-1',
      firstName: 'Taylor',
      lastName: 'Quizzer',
      avatarId: null,
    });
    const screen = await renderRoot(repository, profileRepository);

    expect(await screen.findByText('Luke 2:1')).toBeTruthy();
    expect(screen.queryByTestId('auth-welcome-create-account')).toBeNull();
  });

  it('does not flash MainTabs while profile presence is loading', async () => {
    let release: (value: null) => void = () => undefined;
    const pending = new Promise<null>((resolve) => {
      release = resolve;
    });
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const profileRepository = createQuizzerProfileRepositoryFake();
    (profileRepository.getProfile as jest.Mock).mockImplementation(async () => pending);

    const screen = await renderRoot(repository, profileRepository);

    expect(await screen.findByTestId('quizzer-profile-loading')).toBeTruthy();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
    expect(screen.queryByTestId('quizzer-name-title')).toBeNull();

    await act(async () => {
      release(null);
    });

    expect(await screen.findByTestId('quizzer-name-title')).toBeTruthy();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
  });

  it('routes missing profile to Quizzer name onboarding', async () => {
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const screen = await renderRoot(repository);

    expect(await screen.findByTestId('quizzer-name-title')).toBeTruthy();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
  });

  it('routes profile load failure to recovery UI, not name onboarding', async () => {
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const profileRepository = createQuizzerProfileRepositoryFake({
      getError: new QuizzerProfileError(
        'unavailable',
        'Profile is temporarily unavailable.',
      ),
    });

    const screen = await renderRoot(repository, profileRepository);

    expect(await screen.findByTestId('quizzer-profile-load-error-title')).toBeTruthy();
    expect(screen.queryByTestId('quizzer-name-title')).toBeNull();
    expect(screen.queryByText('Luke 2:1')).toBeNull();
  });

  it('keeps MainTabs and Settings mounted after same-uid identity refresh', async () => {
    const user = userEvent.setup();
    const repository = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const profileRepository = createQuizzerProfileRepositoryFake();
    profileRepository.seed({
      quizzerId: 'user-1',
      firstName: 'Taylor',
      lastName: 'Quizzer',
      avatarId: null,
    });

    const screen = await renderRoot(repository, profileRepository);

    expect(await screen.findByText('Luke 2:1')).toBeTruthy();
    const getProfileCallsBefore = (profileRepository.getProfile as jest.Mock).mock.calls.length;

    await user.press(screen.getByText('Profile'));
    expect(await screen.findByTestId('profile-home-full-name')).toBeTruthy();

    await user.press(screen.getByTestId('profile-home-settings'));
    expect(await screen.findByTestId('settings-email')).toBeTruthy();
    expect(screen.getByText('quizzer@example.com')).toBeTruthy();

    await waitFor(() => {
      expect(repository.refreshIdentity).toHaveBeenCalled();
    });

    expect(screen.getByTestId('settings-email')).toBeTruthy();
    expect(screen.queryByTestId('quizzer-profile-loading')).toBeNull();
    expect(screen.queryByTestId('quizzer-name-title')).toBeNull();
    expect(profileRepository.getProfile).toHaveBeenCalledTimes(getProfileCallsBefore);
  });
});

describe('IgniteEntryScreen reduced motion', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('still presents the brand when Reduce Motion is enabled', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({
      remove: jest.fn(),
    } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>);

    const screen = await render(<IgniteEntryScreen />);

    await waitFor(() => {
      expect(screen.getByText(authCopy.brand.name)).toBeTruthy();
    });
  });
});
