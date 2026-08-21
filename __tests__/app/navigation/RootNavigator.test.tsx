import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo } from 'react-native';

import { RootNavigator } from '../../../src/app/navigation/RootNavigator';
import { AuthProvider } from '../../../src/features/auth';
import { authCopy } from '../../../src/features/auth/copy/authCopy';
import { IgniteEntryScreen } from '../../../src/features/auth/screens/IgniteEntryScreen';
import { createAuthRepositoryFake } from '../../../test-utils/authRepositoryFake';

jest.mock('../../../src/features/flashcards/repositories/firebaseCurriculumSource', () => {
  const { jsonCurriculumRepository } = jest.requireActual(
    '../../../src/features/flashcards/repositories/jsonCurriculumRepository',
  ) as typeof import('../../../src/features/flashcards/repositories/jsonCurriculumRepository');

  return {
    createFirebaseCurriculumSource: jest.fn(),
    firestoreCurriculumRepository: jsonCurriculumRepository,
  };
});

async function renderRoot(repository: ReturnType<typeof createAuthRepositoryFake>) {
  return render(
    <AuthProvider repository={repository}>
      <RootNavigator />
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
    const screen = await renderRoot(repository);

    expect(await screen.findByText('Luke 2:1')).toBeTruthy();
    expect(screen.queryByTestId('auth-welcome-create-account')).toBeNull();
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
