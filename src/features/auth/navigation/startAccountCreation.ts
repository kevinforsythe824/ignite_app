import type { NavigationProp } from '@react-navigation/native';

import type { AuthStackParamList } from './types';

/** Nested account-creation stack. Future privacy/age gate inserts here as the initial route. */
export const ACCOUNT_CREATION_ROUTE = 'AccountCreation' satisfies keyof AuthStackParamList;

/**
 * Starts account creation from Welcome (or any signed-out auth screen).
 * Callers must not navigate to the credential form by name.
 */
export function startAccountCreation(
  navigation: NavigationProp<AuthStackParamList>,
): void {
  navigation.navigate(ACCOUNT_CREATION_ROUTE);
}
