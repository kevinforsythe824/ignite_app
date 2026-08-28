/**
 * Auth presentation routes.
 *
 * AccountCreation is a nested stack whose initial route is PrivacyAge
 * (then CreateAccount for 13+, or parental-consent screens for under 13).
 * Do not navigate from Welcome directly to CreateAccount.
 */
export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  ForgotPassword: undefined;
  AccountCreation: undefined;
};

export type AccountCreationStackParamList = {
  PrivacyAge: undefined;
  ParentConsentIntro: undefined;
  ParentEmail: undefined;
  ConsentPending: undefined;
  ConsentChangeEmail: undefined;
  ConsentRecovery: undefined;
  CreateAccount: undefined;
};
