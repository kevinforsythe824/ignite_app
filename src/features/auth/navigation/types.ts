/**
 * Auth presentation routes.
 *
 * AccountCreation is a nested stack so a future approved privacy/age screen
 * can become its initial route without changing Welcome or rewriting the auth feature.
 * Do not navigate from Welcome directly to CreateAccount.
 */
export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  ForgotPassword: undefined;
  AccountCreation: undefined;
};

export type AccountCreationStackParamList = {
  CreateAccount: undefined;
};
