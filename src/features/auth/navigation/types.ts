/**
 * Auth presentation routes.
 *
 * AccountCreation is a nested stack whose initial route is PrivacyAge
 * (then CreateAccount, or UnderThirteenBlocked). Do not navigate from
 * Welcome directly to CreateAccount.
 */
export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  ForgotPassword: undefined;
  AccountCreation: undefined;
};

export type AccountCreationStackParamList = {
  PrivacyAge: undefined;
  UnderThirteenBlocked: undefined;
  CreateAccount: undefined;
};
