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
import { createAuthRepositoryFake } from '../../../test-utils/authRepositoryFake';

const Stack = createNativeStackNavigator();

async function renderAuthFlow(
  repository: ReturnType<typeof createAuthRepositoryFake>,
) {
  return render(
    <AuthProvider repository={repository}>
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
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
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name={name} component={component} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>,
  );
}

describe('AuthNavigator screens', () => {
  it('shows Welcome actions and opens Sign In', async () => {
    const repository = createAuthRepositoryFake();
    const screen = await renderAuthFlow(repository);

    expect(await screen.findByTestId('auth-welcome-create-account')).toBeTruthy();
    expect(screen.getByText(authCopy.welcome.supporting)).toBeTruthy();
    fireEvent.press(screen.getByTestId('auth-welcome-sign-in'));

    expect(await screen.findByTestId('auth-sign-in-submit')).toBeTruthy();
    expect(screen.getByText(authCopy.signIn.supporting)).toBeTruthy();
    expect(screen.getByLabelText(authCopy.fields.email)).toBeTruthy();
    expect(screen.getByLabelText(authCopy.fields.password)).toBeTruthy();
  });

  it('opens Create Account through the AccountCreation stack', async () => {
    const repository = createAuthRepositoryFake();
    const screen = await renderAuthFlow(repository);

    fireEvent.press(await screen.findByTestId('auth-welcome-create-account'));

    expect(await screen.findByTestId('auth-create-account-submit')).toBeTruthy();
    expect(screen.getByText(authCopy.createAccount.supporting)).toBeTruthy();
    expect(screen.getByLabelText(authCopy.fields.email)).toBeTruthy();
    expect(screen.getByLabelText(authCopy.fields.password)).toBeTruthy();
    expect(screen.getByLabelText(authCopy.fields.confirmPassword)).toBeTruthy();
  });

  it('blocks invalid sign-in locally without calling the repository', async () => {
    const repository = createAuthRepositoryFake();
    const screen = await renderScreen('SignIn', SignInScreen, repository);

    fireEvent.press(await screen.findByTestId('auth-sign-in-submit'));

    expect(await screen.findByText(authCopy.validation.emailRequired)).toBeTruthy();
    expect(screen.getByText(authCopy.validation.passwordRequired)).toBeTruthy();
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

    await user.type(await screen.findByTestId('auth-forgot-password-email'), 'quizzer@example.com');
    await user.press(screen.getByTestId('auth-forgot-password-submit'));

    expect(await screen.findByText(authCopy.forgotPassword.success)).toBeTruthy();
    expect(repository.sendPasswordResetEmail).toHaveBeenCalledWith('quizzer@example.com');
    expect(repository.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
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
