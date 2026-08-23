import type { AuthStackParamList } from './types';

/** Nested account-creation stack. PrivacyAge is the initial route inside this stack. */
export const ACCOUNT_CREATION_ROUTE = 'AccountCreation' satisfies keyof AuthStackParamList;

export type StartAccountCreationNavigation = {
  navigate: (route: typeof ACCOUNT_CREATION_ROUTE) => void;
  replace: (route: typeof ACCOUNT_CREATION_ROUTE) => void;
};

export type StartAccountCreationOptions = {
  /**
   * When true, replaces the current auth screen (Sign In ↔ Create Account).
   * Welcome and other entry points should omit this so Back returns to Welcome.
   */
  replace?: boolean;
};

/**
 * Starts account creation from Welcome (or any signed-out auth screen).
 * Callers must not navigate to the credential form by name.
 */
export function startAccountCreation(
  navigation: StartAccountCreationNavigation,
  options?: StartAccountCreationOptions,
): void {
  if (options?.replace) {
    navigation.replace(ACCOUNT_CREATION_ROUTE);
    return;
  }
  navigation.navigate(ACCOUNT_CREATION_ROUTE);
}
