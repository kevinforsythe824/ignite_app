import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { useAccountLifecycleDestination } from '../../../src/app/lifecycle/useAccountLifecycleDestination';
import { AuthProvider } from '../../../src/features/auth';
import { ParentalConsentProvider } from '../../../src/features/parentalConsent';
import { QuizzerProfileProvider } from '../../../src/features/profile/state/QuizzerProfileProvider';
import { SeasonParticipationProvider } from '../../../src/features/season/state/SeasonParticipationProvider';
import { createAuthRepositoryFake } from '../../../test-utils/authRepositoryFake';
import { createConsentSecureStoreFake } from '../../../test-utils/consentSecureStoreFake';
import { createParentalConsentRepositoryFake } from '../../../test-utils/parentalConsentRepositoryFake';
import { createQuizzerProfileRepositoryFake } from '../../../test-utils/quizzerProfileRepositoryFake';
import {
  createSeasonParticipationTestDoubles,
  type SeasonParticipationTestDoubles,
} from '../../../test-utils/seasonParticipationTestDoubles';

function DestinationProbe(): React.JSX.Element {
  const destination = useAccountLifecycleDestination();
  return <Text testID="lifecycle-destination">{destination}</Text>;
}

async function renderHookHost(options?: {
  auth?: ReturnType<typeof createAuthRepositoryFake>;
  profiles?: ReturnType<typeof createQuizzerProfileRepositoryFake>;
  secureStore?: ReturnType<typeof createConsentSecureStoreFake>;
  season?: SeasonParticipationTestDoubles;
}) {
  const auth = options?.auth ?? createAuthRepositoryFake({ emitOnSubscribe: false });
  const profiles = options?.profiles ?? createQuizzerProfileRepositoryFake();
  const secureStore = options?.secureStore ?? createConsentSecureStoreFake();
  const season = options?.season ?? createSeasonParticipationTestDoubles();

  const screen = await render(
    <AuthProvider repository={auth}>
      <ParentalConsentProvider
        repository={createParentalConsentRepositoryFake()}
        secureStore={secureStore}
      >
        <QuizzerProfileProvider repository={profiles}>
          <SeasonParticipationProvider
            clock={season.clock}
            materialSetCatalog={season.materialSetCatalog}
            participationRepository={season.participationRepository}
            readEnvironment={season.readEnvironment}
            seasonCatalog={season.seasonCatalog}
          >
            <DestinationProbe />
          </SeasonParticipationProvider>
        </QuizzerProfileProvider>
      </ParentalConsentProvider>
    </AuthProvider>,
  );

  return { screen, auth, profiles };
}

describe('useAccountLifecycleDestination', () => {
  it('is initializing until Auth resolves and does not yield main', async () => {
    const { screen } = await renderHookHost();

    expect(screen.getByTestId('lifecycle-destination').props.children).toBe(
      'initializing',
    );
  });

  it('is unauthenticated after signed-out Auth resolution', async () => {
    const { screen, auth } = await renderHookHost();

    await act(async () => {
      auth.emit(null);
    });

    expect(screen.getByTestId('lifecycle-destination').props.children).toBe(
      'unauthenticated',
    );
  });

  it('reaches main from a ready Season while entitlement stays unavailable', async () => {
    const auth = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const profiles = createQuizzerProfileRepositoryFake();
    profiles.seed({
      quizzerId: 'user-1',
      firstName: 'Taylor',
      lastName: 'Quizzer',
      avatarId: null,
    });

    const { screen } = await renderHookHost({ auth, profiles });

    await waitFor(() => {
      expect(screen.getByTestId('lifecycle-destination').props.children).toBe('main');
    });
    expect(screen.getByTestId('lifecycle-destination').props.children).not.toBe(
      'seasonSetup',
    );
    expect(screen.getByTestId('lifecycle-destination').props.children).not.toBe(
      'entitlementAccess',
    );
    expect(screen.getByTestId('lifecycle-destination').props.children).not.toBe(
      'seasonSetup',
    );
  });

  it('uses the real Season seam when participation is missing', async () => {
    const auth = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const profiles = createQuizzerProfileRepositoryFake();
    profiles.seed({
      quizzerId: 'user-1',
      firstName: 'Taylor',
      lastName: 'Quizzer',
      avatarId: null,
    });
    const season = createSeasonParticipationTestDoubles();
    season.participationRepository.getParticipation.mockResolvedValue(null);

    const { screen } = await renderHookHost({ auth, profiles, season });

    await waitFor(() => {
      expect(screen.getByTestId('lifecycle-destination').props.children).toBe(
        'seasonSetup',
      );
    });
    expect(screen.getByTestId('lifecycle-destination').props.children).not.toBe('main');
    expect(screen.getByTestId('lifecycle-destination').props.children).not.toBe(
      'entitlementAccess',
    );
  });

  it('keeps claim required ahead of a ready profile', async () => {
    const auth = createAuthRepositoryFake({
      initialIdentity: {
        uid: 'user-1',
        email: 'quizzer@example.com',
        emailVerified: false,
      },
    });
    const profiles = createQuizzerProfileRepositoryFake();
    profiles.seed({
      quizzerId: 'user-1',
      firstName: 'Taylor',
      lastName: 'Quizzer',
      avatarId: null,
    });
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
      pendingClaimUid: 'user-1',
    });

    const { screen } = await renderHookHost({ auth, profiles, secureStore });

    await waitFor(() => {
      expect(screen.getByTestId('lifecycle-destination').props.children).toBe(
        'consentClaim',
      );
    });
  });
});
