import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, userEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import { AuthProvider, AuthenticationError } from '../../../src/features/auth';
import { authCopy } from '../../../src/features/auth/copy/authCopy';
import { AuthNavigator } from '../../../src/features/auth/navigation/AuthNavigator';
import { CreateAccountScreen } from '../../../src/features/auth/screens/CreateAccountScreen';
import { ForgotPasswordScreen } from '../../../src/features/auth/screens/ForgotPasswordScreen';
import { SignInScreen } from '../../../src/features/auth/screens/SignInScreen';
import { ParentalConsentProvider } from '../../../src/features/parentalConsent';
import { quizzerProfileCopy } from '../../../src/features/profile/copy/quizzerProfileCopy';
import { QuizzerProfileProvider } from '../../../src/features/profile/state/QuizzerProfileProvider';
import { createAuthRepositoryFake } from '../../../test-utils/authRepositoryFake';
import { createConsentSecureStoreFake } from '../../../test-utils/consentSecureStoreFake';
import { createParentalConsentRepositoryFake } from '../../../test-utils/parentalConsentRepositoryFake';
import { createQuizzerProfileRepositoryFake } from '../../../test-utils/quizzerProfileRepositoryFake';

const Stack = createNativeStackNavigator();

async function renderAuthFlow(
  repository: ReturnType<typeof createAuthRepositoryFake>,
) {
  return render(
    <AuthProvider repository={repository}>
      <ParentalConsentProvider
        repository={createParentalConsentRepositoryFake()}
        secureStore={createConsentSecureStoreFake()}
      >
        <NavigationContainer>
          <AuthNavigator />
        </NavigationContainer>
      </ParentalConsentProvider>
    </AuthProvider>,
  );
}

async function renderScreen(
  name: string,
  component: React.ComponentType,
  repository: ReturnType<typeof createAuthRepositoryFake>,
) {
  return render(
    <AuthProvider repository={repository}>
      <ParentalConsentProvider
        repository={createParentalConsentRepositoryFake()}
        secureStore={createConsentSecureStoreFake()}
      >
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name={name} component={component} />
          </Stack.Navigator>
        </NavigationContainer>
      </ParentalConsentProvider>
    </AuthProvider>,
  );
}

describe('AuthNavigator screens', () => {
  it('shows Welcome brand, value items, and opens Sign In', async () => {
    const repository = createAuthRepositoryFake();
    const screen = await renderAuthFlow(repository);

    expect(await screen.findByTestId('auth-welcome-create-account')).toBeTruthy();
    expect(screen.getByText(authCopy.brand.name)).toBeTruthy();
    expect(screen.getByText(authCopy.welcome.tagline)).toBeTruthy();
    for (const item of authCopy.welcome.valueItems) {
      expect(
        screen.getByLabelText(`${item.title}. ${item.description}`),
      ).toBeTruthy();
    }
    fireEvent.press(screen.getByTestId('auth-welcome-sign-in'));

    expect(await screen.findByTestId('auth-sign-in-submit')).toBeTruthy();
    expect(screen.getAllByText(authCopy.signIn.title).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(authCopy.signIn.supporting)).toBeTruthy();
    expect(screen.getByLabelText(authCopy.fields.email)).toBeTruthy();
    expect(screen.getByLabelText(authCopy.fields.password)).toBeTruthy();
  });

  it('opens Create Account through PrivacyAge then the credential form', async () => {
    const repository = createAuthRepositoryFake();
    const screen = await renderAuthFlow(repository);

    fireEvent.press(await screen.findByTestId('auth-welcome-create-account'));

    expect(await screen.findByTestId('auth-privacy-age-question')).toBeTruthy();
    expect(screen.queryByTestId('auth-create-account-submit')).toBeNull();

    fireEvent.press(screen.getByTestId('auth-privacy-age-thirteen-or-older'));

    expect(await screen.findByTestId('auth-create-account-submit')).toBeTruthy();
    expect(screen.getByText(authCopy.createAccount.title)).toBeTruthy();
    expect(screen.getByText(authCopy.createAccount.supporting)).toBeTruthy();
    expect(screen.queryByText('Choose a password you can remember.')).toBeNull();
    expect(screen.getByLabelText(authCopy.fields.email)).toBeTruthy();
    expect(screen.getByLabelText(authCopy.fields.password)).toBeTruthy();
    expect(screen.getByLabelText(authCopy.fields.confirmPassword)).toBeTruthy();
  });

  it('routes the under-13 path to parent consent intro before Create Account', async () => {
    const repository = createAuthRepositoryFake();
    const screen = await renderAuthFlow(repository);

    fireEvent.press(await screen.findByTestId('auth-welcome-create-account'));
    fireEvent.press(await screen.findByTestId('auth-privacy-age-under-thirteen'));

    expect(await screen.findByTestId('consent-intro-title')).toBeTruthy();
    expect(screen.queryByTestId('auth-create-account-submit')).toBeNull();
    expect(repository.signUp).not.toHaveBeenCalled();
  });

  it('does not expose email or name fields on the PrivacyAge screen', async () => {
    const repository = createAuthRepositoryFake();
    const screen = await renderAuthFlow(repository);

    fireEvent.press(await screen.findByTestId('auth-welcome-create-account'));
    expect(await screen.findByTestId('auth-privacy-age-question')).toBeTruthy();

    expect(screen.queryByLabelText(authCopy.fields.email)).toBeNull();
    expect(screen.queryByTestId('auth-create-account-email')).toBeNull();
    expect(screen.queryByLabelText(quizzerProfileCopy.name.firstName)).toBeNull();
    expect(screen.queryByLabelText(quizzerProfileCopy.name.lastName)).toBeNull();
    expect(screen.queryByTestId('quizzer-name-first')).toBeNull();
    expect(screen.queryByTestId('quizzer-name-last')).toBeNull();
  });

  it('does not persist the privacy-age choice through auth or profile writes', async () => {
    const authRepository = createAuthRepositoryFake();
    const profileRepository = createQuizzerProfileRepositoryFake();
    const asyncStorage = require('@react-native-async-storage/async-storage') as {
      createAsyncStorage: jest.Mock;
    };
    const setItem = jest.fn(async () => undefined);
    asyncStorage.createAsyncStorage.mockReturnValue({
      getItem: jest.fn(async () => null),
      setItem,
      removeItem: jest.fn(async () => undefined),
    });

    const screen = await render(
      <AuthProvider repository={authRepository}>
        <ParentalConsentProvider
          repository={createParentalConsentRepositoryFake()}
          secureStore={createConsentSecureStoreFake()}
        >
          <QuizzerProfileProvider repository={profileRepository}>
            <NavigationContainer>
              <AuthNavigator />
            </NavigationContainer>
          </QuizzerProfileProvider>
        </ParentalConsentProvider>
      </AuthProvider>,
    );

    fireEvent.press(await screen.findByTestId('auth-welcome-create-account'));
    expect(await screen.findByTestId('auth-privacy-age-question')).toBeTruthy();
    expect(screen.getByText(authCopy.privacyAge.supporting)).toBeTruthy();

    jest.clearAllMocks();
    setItem.mockClear();

    fireEvent.press(screen.getByTestId('auth-privacy-age-under-thirteen'));
    expect(await screen.findByTestId('consent-intro-title')).toBeTruthy();

    expect(authRepository.signUp).not.toHaveBeenCalled();
    expect(authRepository.signIn).not.toHaveBeenCalled();
    expect(profileRepository.getProfile).not.toHaveBeenCalled();
    expect(profileRepository.provisionProfile).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText(authCopy.actions.back));
    fireEvent.press(await screen.findByTestId('auth-privacy-age-thirteen-or-older'));
    expect(await screen.findByTestId('auth-create-account-submit')).toBeTruthy();

    expect(authRepository.signUp).not.toHaveBeenCalled();
    expect(authRepository.signIn).not.toHaveBeenCalled();
    expect(profileRepository.getProfile).not.toHaveBeenCalled();
    expect(profileRepository.provisionProfile).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('blocks invalid sign-in locally without calling the repository', async () => {
    const repository = createAuthRepositoryFake();
    const screen = await renderScreen('SignIn', SignInScreen, repository);

    fireEvent.press(await screen.findByTestId('auth-sign-in-submit'));

    expect(await screen.findByText(authCopy.validation.emailRequired)).toBeTruthy();
    expect(screen.getByText(authCopy.validation.passwordRequired)).toBeTruthy();
    expect(repository.signIn).not.toHaveBeenCalled();
  });

  it('shows an email format error on Sign In submit', async () => {
    const user = userEvent.setup();
    const repository = createAuthRepositoryFake();
    const screen = await renderScreen('SignIn', SignInScreen, repository);

    await user.type(await screen.findByTestId('auth-sign-in-email'), 'not-an-email');
    await user.type(screen.getByTestId('auth-sign-in-password'), 'secret');
    await user.press(screen.getByTestId('auth-sign-in-submit'));

    expect(await screen.findByText(authCopy.validation.emailInvalid)).toBeTruthy();
    expect(repository.signIn).not.toHaveBeenCalled();
  });

  it('shows an email format error when Sign In email blurs invalid', async () => {
    const user = userEvent.setup();
    const repository = createAuthRepositoryFake();
    const screen = await renderScreen('SignIn', SignInScreen, repository);

    const emailField = await screen.findByTestId('auth-sign-in-email');
    await user.type(emailField, 'not-an-email');
    fireEvent(emailField, 'blur');

    expect(await screen.findByText(authCopy.validation.emailInvalid)).toBeTruthy();
    expect(repository.signIn).not.toHaveBeenCalled();
  });

  it('signs in with valid credentials', async () => {
    const user = userEvent.setup();
    const repository = createAuthRepositoryFake();
    const screen = await renderScreen('SignIn', SignInScreen, repository);

    await user.type(await screen.findByTestId('auth-sign-in-email'), 'quizzer@example.com');
    await user.type(screen.getByTestId('auth-sign-in-password'), 'secret');
    await user.press(screen.getByTestId('auth-sign-in-submit'));

    await waitFor(() => {
      expect(repository.signIn).toHaveBeenCalledWith({
        email: 'quizzer@example.com',
        password: 'secret',
      });
    });
  });

  it('shows application-facing sign-in errors', async () => {
    const user = userEvent.setup();
    const repository = createAuthRepositoryFake({
      signInError: new AuthenticationError(
        'invalid-credentials',
        'Email or password is incorrect.',
      ),
    });
    const screen = await renderScreen('SignIn', SignInScreen, repository);

    await user.type(await screen.findByTestId('auth-sign-in-email'), 'quizzer@example.com');
    await user.type(screen.getByTestId('auth-sign-in-password'), 'wrong');
    await user.press(screen.getByTestId('auth-sign-in-submit'));

    expect(await screen.findByText('Email or password is incorrect.')).toBeTruthy();
  });

  it('prevents duplicate sign-in submits', async () => {
    const user = userEvent.setup();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const repository = createAuthRepositoryFake({ signInDelay: () => gate });
    const screen = await renderScreen('SignIn', SignInScreen, repository);

    await user.type(await screen.findByTestId('auth-sign-in-email'), 'quizzer@example.com');
    await user.type(screen.getByTestId('auth-sign-in-password'), 'secret');
    await user.press(screen.getByTestId('auth-sign-in-submit'));
    await user.press(screen.getByTestId('auth-sign-in-submit'));

    expect(repository.signIn).toHaveBeenCalledTimes(1);
    release();
    await waitFor(() => {
      expect(repository.signIn).toHaveBeenCalledTimes(1);
    });
  });

  it('announces a submitting label on Sign In', async () => {
    const user = userEvent.setup();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const repository = createAuthRepositoryFake({ signInDelay: () => gate });
    const screen = await renderScreen('SignIn', SignInScreen, repository);

    await user.type(await screen.findByTestId('auth-sign-in-email'), 'quizzer@example.com');
    await user.type(screen.getByTestId('auth-sign-in-password'), 'secret');
    await user.press(screen.getByTestId('auth-sign-in-submit'));

    expect(screen.getByLabelText(authCopy.signIn.submitting)).toBeTruthy();
    release();
    await waitFor(() => {
      expect(repository.signIn).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps the password visibility toggle labeled in the password field', async () => {
    const user = userEvent.setup();
    const repository = createAuthRepositoryFake();
    const screen = await renderScreen('SignIn', SignInScreen, repository);

    const toggle = await screen.findByLabelText(authCopy.fields.showPassword);
    expect(screen.getByTestId('auth-sign-in-password')).toBeTruthy();
    await user.press(toggle);
    expect(screen.getByLabelText(authCopy.fields.hidePassword)).toBeTruthy();
  });

  it('blocks create-account confirmation mismatch without calling signUp', async () => {
    const user = userEvent.setup();
    const repository = createAuthRepositoryFake();
    const screen = await renderScreen('CreateAccount', CreateAccountScreen, repository);

    await user.type(await screen.findByTestId('auth-create-account-email'), 'quizzer@example.com');
    await user.type(screen.getByTestId('auth-create-account-password'), 'secret');
    await user.type(screen.getByTestId('auth-create-account-confirm-password'), 'other');
    await user.press(screen.getByTestId('auth-create-account-submit'));

    expect(await screen.findByText(authCopy.validation.passwordMismatch)).toBeTruthy();
    expect(repository.signUp).not.toHaveBeenCalled();
  });

  it('shows a password mismatch error while confirming on Create Account', async () => {
    const user = userEvent.setup();
    const repository = createAuthRepositoryFake();
    const screen = await renderScreen('CreateAccount', CreateAccountScreen, repository);

    await user.type(await screen.findByTestId('auth-create-account-password'), 'secret');
    await user.type(screen.getByTestId('auth-create-account-confirm-password'), 'other');

    expect(await screen.findByText(authCopy.validation.passwordMismatch)).toBeTruthy();
    expect(repository.signUp).not.toHaveBeenCalled();
  });

  it('shows an email format error on Create Account submit', async () => {
    const user = userEvent.setup();
    const repository = createAuthRepositoryFake();
    const screen = await renderScreen('CreateAccount', CreateAccountScreen, repository);

    await user.type(await screen.findByTestId('auth-create-account-email'), 'not-an-email');
    await user.type(screen.getByTestId('auth-create-account-password'), 'secret');
    await user.type(screen.getByTestId('auth-create-account-confirm-password'), 'secret');
    await user.press(screen.getByTestId('auth-create-account-submit'));

    expect(await screen.findByText(authCopy.validation.emailInvalid)).toBeTruthy();
    expect(repository.signUp).not.toHaveBeenCalled();
  });

  it('shows an email format error when Create Account email blurs invalid', async () => {
    const user = userEvent.setup();
    const repository = createAuthRepositoryFake();
    const screen = await renderScreen('CreateAccount', CreateAccountScreen, repository);

    const emailField = await screen.findByTestId('auth-create-account-email');
    await user.type(emailField, 'not-an-email');
    fireEvent(emailField, 'blur');

    expect(await screen.findByText(authCopy.validation.emailInvalid)).toBeTruthy();
    expect(repository.signUp).not.toHaveBeenCalled();
  });

  it('creates an account with email and password only', async () => {
    const user = userEvent.setup();
    const repository = createAuthRepositoryFake();
    const screen = await renderScreen('CreateAccount', CreateAccountScreen, repository);

    await user.type(await screen.findByTestId('auth-create-account-email'), 'new@example.com');
    await user.type(screen.getByTestId('auth-create-account-password'), 'secret');
    await user.type(screen.getByTestId('auth-create-account-confirm-password'), 'secret');
    await user.press(screen.getByTestId('auth-create-account-submit'));

    await waitFor(() => {
      expect(repository.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'secret',
      });
    });
    expect(repository.signUp).toHaveBeenCalledTimes(1);
  });

  it('shows create-account application errors', async () => {
    const user = userEvent.setup();
    const repository = createAuthRepositoryFake({
      signUpError: new AuthenticationError(
        'email-already-in-use',
        'An account with this email already exists.',
      ),
    });
    const screen = await renderScreen('CreateAccount', CreateAccountScreen, repository);

    await user.type(await screen.findByTestId('auth-create-account-email'), 'quizzer@example.com');
    await user.type(screen.getByTestId('auth-create-account-password'), 'secret');
    await user.type(screen.getByTestId('auth-create-account-confirm-password'), 'secret');
    await user.press(screen.getByTestId('auth-create-account-submit'));

    expect(await screen.findByText('An account with this email already exists.')).toBeTruthy();
  });

  it('announces a submitting label on Create Account', async () => {
    const user = userEvent.setup();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const repository = createAuthRepositoryFake({ signUpDelay: () => gate });
    const screen = await renderScreen('CreateAccount', CreateAccountScreen, repository);

    await user.type(await screen.findByTestId('auth-create-account-email'), 'new@example.com');
    await user.type(screen.getByTestId('auth-create-account-password'), 'secret');
    await user.type(screen.getByTestId('auth-create-account-confirm-password'), 'secret');
    await user.press(screen.getByTestId('auth-create-account-submit'));

    expect(screen.getByLabelText(authCopy.createAccount.submitting)).toBeTruthy();
    release();
    await waitFor(() => {
      expect(repository.signUp).toHaveBeenCalledTimes(1);
    });
  });

  it('shows a neutral forgot-password success message', async () => {
    const user = userEvent.setup();
    const repository = createAuthRepositoryFake();
    const screen = await renderScreen('ForgotPassword', ForgotPasswordScreen, repository);

    expect(await screen.findByText(authCopy.forgotPassword.title)).toBeTruthy();
    await user.type(await screen.findByTestId('auth-forgot-password-email'), 'quizzer@example.com');
    await user.press(screen.getByTestId('auth-forgot-password-submit'));

    expect(await screen.findByText(authCopy.forgotPassword.success)).toBeTruthy();
    expect(repository.sendPasswordResetEmail).toHaveBeenCalledWith('quizzer@example.com');
    expect(repository.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it('shows an email format error on Forgot Password submit', async () => {
    const user = userEvent.setup();
    const repository = createAuthRepositoryFake();
    const screen = await renderScreen('ForgotPassword', ForgotPasswordScreen, repository);

    await user.type(await screen.findByTestId('auth-forgot-password-email'), 'not-an-email');
    await user.press(screen.getByTestId('auth-forgot-password-submit'));

    expect(await screen.findByText(authCopy.validation.emailInvalid)).toBeTruthy();
    expect(repository.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('shows an email format error when Forgot Password email blurs invalid', async () => {
    const user = userEvent.setup();
    const repository = createAuthRepositoryFake();
    const screen = await renderScreen('ForgotPassword', ForgotPasswordScreen, repository);

    const emailField = await screen.findByTestId('auth-forgot-password-email');
    await user.type(emailField, 'not-an-email');
    fireEvent(emailField, 'blur');

    expect(await screen.findByText(authCopy.validation.emailInvalid)).toBeTruthy();
    expect(repository.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('returns to the previous Sign In screen from Back to Sign In', async () => {
    const repository = createAuthRepositoryFake();
    const screen = await renderAuthFlow(repository);

    fireEvent.press(await screen.findByTestId('auth-welcome-sign-in'));
    expect(await screen.findByTestId('auth-sign-in-submit')).toBeTruthy();

    fireEvent.press(screen.getByText(authCopy.signIn.forgotPassword));
    expect(await screen.findByTestId('auth-forgot-password-back-to-sign-in')).toBeTruthy();

    fireEvent.press(screen.getByTestId('auth-forgot-password-back-to-sign-in'));

    expect(await screen.findByTestId('auth-sign-in-submit')).toBeTruthy();
    expect(screen.queryByTestId('auth-forgot-password-submit')).toBeNull();
  });

  it('does not stack Sign In and Create Account when switching between them', async () => {
    const repository = createAuthRepositoryFake();
    const screen = await renderAuthFlow(repository);

    fireEvent.press(await screen.findByTestId('auth-welcome-create-account'));
    fireEvent.press(await screen.findByTestId('auth-privacy-age-thirteen-or-older'));
    expect(await screen.findByTestId('auth-create-account-sign-in')).toBeTruthy();

    fireEvent.press(screen.getByTestId('auth-create-account-sign-in'));
    expect(await screen.findByTestId('auth-sign-in-create-account')).toBeTruthy();

    fireEvent.press(screen.getByTestId('auth-sign-in-create-account'));
    fireEvent.press(await screen.findByTestId('auth-privacy-age-thirteen-or-older'));
    expect(await screen.findByTestId('auth-create-account-sign-in')).toBeTruthy();

    fireEvent.press(screen.getByTestId('auth-create-account-sign-in'));
    expect(await screen.findByTestId('auth-sign-in-submit')).toBeTruthy();

    fireEvent.press(screen.getByLabelText(authCopy.actions.back));
    expect(await screen.findByTestId('auth-welcome-create-account')).toBeTruthy();
    expect(screen.queryByTestId('auth-sign-in-submit')).toBeNull();
    expect(screen.queryByTestId('auth-create-account-submit')).toBeNull();
  });

  it('announces a submitting label on Forgot Password', async () => {
    const user = userEvent.setup();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const repository = createAuthRepositoryFake({ resetDelay: () => gate });
    const screen = await renderScreen('ForgotPassword', ForgotPasswordScreen, repository);

    await user.type(await screen.findByTestId('auth-forgot-password-email'), 'quizzer@example.com');
    await user.press(screen.getByTestId('auth-forgot-password-submit'));

    expect(screen.getByLabelText(authCopy.forgotPassword.submitting)).toBeTruthy();
    release();
    await waitFor(() => {
      expect(repository.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    });
  });
});
