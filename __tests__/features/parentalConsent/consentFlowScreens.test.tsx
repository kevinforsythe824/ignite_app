import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

import { AuthProvider } from '../../../src/features/auth';
import { authCopy } from '../../../src/features/auth/copy/authCopy';
import { AuthNavigator } from '../../../src/features/auth/navigation/AuthNavigator';
import { ParentalConsentProvider } from '../../../src/features/parentalConsent';
import { parentalConsentCopy } from '../../../src/features/parentalConsent/copy/parentalConsentCopy';
import { ConsentPendingScreen } from '../../../src/features/parentalConsent/screens/ConsentPendingScreen';
import { createAuthRepositoryFake } from '../../../test-utils/authRepositoryFake';
import { createConsentSecureStoreFake } from '../../../test-utils/consentSecureStoreFake';
import { createParentalConsentRepositoryFake } from '../../../test-utils/parentalConsentRepositoryFake';

async function renderFlow(options?: {
  auth?: ReturnType<typeof createAuthRepositoryFake>;
  secureStore?: ReturnType<typeof createConsentSecureStoreFake>;
  consentRepository?: ReturnType<typeof createParentalConsentRepositoryFake>;
}) {
  const auth = options?.auth ?? createAuthRepositoryFake();
  const secureStore = options?.secureStore ?? createConsentSecureStoreFake();
  const consentRepository =
    options?.consentRepository ?? createParentalConsentRepositoryFake();

  const screen = await render(
    <AuthProvider repository={auth}>
      <ParentalConsentProvider repository={consentRepository} secureStore={secureStore}>
        <NavigationContainer>
          <AuthNavigator />
        </NavigationContainer>
      </ParentalConsentProvider>
    </AuthProvider>,
  );

  await waitFor(() => {
    expect(screen.getByTestId('auth-welcome-create-account')).toBeTruthy();
  });

  return { screen, auth, secureStore, consentRepository };
}

async function openPrivacyAge(
  screen: Awaited<ReturnType<typeof renderFlow>>['screen'],
): Promise<void> {
  fireEvent.press(screen.getByTestId('auth-welcome-create-account'));
  await waitFor(() => {
    expect(screen.getByTestId('auth-privacy-age-question')).toBeTruthy();
  });
  await waitFor(() => {
    expect(
      screen.getByTestId('auth-privacy-age-thirteen-or-older').props.accessibilityState
        ?.disabled,
    ).not.toBe(true);
  });
}

describe('parental consent account-creation flow', () => {
  it('shows Quizzer-focused PrivacyAge copy without DOB or child credential fields', async () => {
    const { screen } = await renderFlow();
    await openPrivacyAge(screen);

    expect(screen.getByText(authCopy.privacyAge.title)).toBeTruthy();
    expect(screen.getByText(authCopy.privacyAge.supporting)).toBeTruthy();
    expect(screen.queryByLabelText(authCopy.fields.email)).toBeNull();
    expect(screen.queryByTestId('auth-create-account-email')).toBeNull();
    expect(screen.queryByTestId('auth-create-account-password')).toBeNull();
  });

  it('routes under-13 to intro then parent email only', async () => {
    const { screen } = await renderFlow();
    await openPrivacyAge(screen);
    fireEvent.press(screen.getByTestId('auth-privacy-age-under-thirteen'));

    expect(await screen.findByTestId('consent-intro-title')).toBeTruthy();
    fireEvent.press(screen.getByTestId('consent-intro-continue'));

    expect(await screen.findByTestId('consent-parent-email-title')).toBeTruthy();
    expect(screen.getByLabelText(parentalConsentCopy.parentEmail.fieldLabel)).toBeTruthy();
    expect(screen.queryByLabelText(authCopy.fields.password)).toBeNull();
  });

  it('does not bypass active consent via 13+ without Start over', async () => {
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
    });
    const consentRepository = createParentalConsentRepositoryFake({
      initialSnapshot: {
        status: 'pending',
        maskedParentEmail: 'p***@example.com',
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        bindingState: 'unbound',
      },
    });
    const { screen } = await renderFlow({ secureStore, consentRepository });
    await openPrivacyAge(screen);

    expect(screen.getByTestId('auth-privacy-age-restore')).toBeTruthy();
    fireEvent.press(screen.getByTestId('auth-privacy-age-thirteen-or-older'));
    expect(await screen.findByTestId('auth-privacy-age-active-prompt')).toBeTruthy();
    expect(screen.queryByTestId('auth-create-account-submit')).toBeNull();
  });

  it('opens Create Account only after approved unbound status', async () => {
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
    });
    const consentRepository = createParentalConsentRepositoryFake({
      initialSnapshot: {
        status: 'approved',
        maskedParentEmail: 'p***@example.com',
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        bindingState: 'unbound',
      },
    });
    const { screen } = await renderFlow({ secureStore, consentRepository });
    await openPrivacyAge(screen);
    fireEvent.press(screen.getByTestId('auth-privacy-age-continue-approval'));

    expect(await screen.findByTestId('auth-create-account-submit')).toBeTruthy();
  });

  it('never opens Create Account for approved bound consent', async () => {
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
    });
    const consentRepository = createParentalConsentRepositoryFake({
      initialSnapshot: {
        status: 'approved',
        maskedParentEmail: 'p***@example.com',
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        bindingState: 'bound',
      },
    });
    const { screen } = await renderFlow({ secureStore, consentRepository });
    await openPrivacyAge(screen);
    fireEvent.press(screen.getByTestId('auth-privacy-age-continue-approval'));

    expect(await screen.findByTestId('consent-recovery-title')).toBeTruthy();
    expect(screen.queryByTestId('auth-create-account-submit')).toBeNull();
  });

  it('EXISTING ACCOUNT START-OVER RECOVERY: Start over keeps recovery UID and never opens CreateAccount', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirm = buttons?.find((button) => button.style === 'destructive');
      confirm?.onPress?.();
    });

    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-dead',
      clientSessionToken: 'token-dead',
      pendingClaimUid: 'user-existing',
    });
    const consentRepository = createParentalConsentRepositoryFake({
      initialSnapshot: {
        status: 'approved',
        maskedParentEmail: 'p***@example.com',
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        bindingState: 'unbound',
      },
    });

    const { screen } = await renderFlow({ secureStore, consentRepository });
    await openPrivacyAge(screen);

    fireEvent.press(screen.getByTestId('auth-privacy-age-start-over'));

    await waitFor(() => {
      expect(secureStore.peek()?.pendingClaimUid).toBe('user-existing');
    });
    expect(secureStore.peek()?.needsFreshConsent).toBe(true);
    expect(secureStore.peek()?.requestId).toBeUndefined();
    expect(screen.queryByTestId('auth-create-account-submit')).toBeNull();

    fireEvent.press(screen.getByTestId('auth-privacy-age-continue-approval'));
    expect(await screen.findByTestId('consent-intro-title')).toBeTruthy();
    expect(screen.queryByTestId('auth-create-account-submit')).toBeNull();

    alertSpy.mockRestore();
  });

  it('13+ signup path unchanged: Create Account opens without consent session', async () => {
    const { screen } = await renderFlow();
    await openPrivacyAge(screen);
    fireEvent.press(screen.getByTestId('auth-privacy-age-thirteen-or-older'));
    expect(await screen.findByTestId('auth-create-account-submit')).toBeTruthy();
  });
});

describe('ConsentPendingScreen refresh stability', () => {
  it('PENDING SCREEN: focus refresh does not loop getStatus / loading after settle', async () => {
    const Stack = createNativeStackNavigator();
    const secureStore = createConsentSecureStoreFake({
      version: 1,
      requestId: 'req-1',
      clientSessionToken: 'token-1',
    });
    const consentRepository = createParentalConsentRepositoryFake({
      initialSnapshot: {
        status: 'pending',
        maskedParentEmail: 'p***@example.com',
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        bindingState: 'unbound',
      },
    });

    const screen = await render(
      <AuthProvider repository={createAuthRepositoryFake()}>
        <ParentalConsentProvider repository={consentRepository} secureStore={secureStore}>
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen name="ConsentPending" component={ConsentPendingScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </ParentalConsentProvider>
      </AuthProvider>,
    );

    expect(await screen.findByTestId('consent-pending-title')).toBeTruthy();
    await waitFor(() => {
      expect(consentRepository.getStatusCallCount()).toBeGreaterThanOrEqual(1);
    });

    const callsAfterFocus = consentRepository.getStatusCallCount();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(consentRepository.getStatusCallCount()).toBe(callsAfterFocus);
    expect(callsAfterFocus).toBeLessThanOrEqual(2);
    expect(screen.getByTestId('consent-pending-check-again')).toBeTruthy();
    expect(screen.getByTestId('consent-pending-resend')).toBeTruthy();
    expect(screen.getByTestId('consent-pending-change-email')).toBeTruthy();
  });
});
