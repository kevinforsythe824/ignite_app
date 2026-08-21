import { authCopy } from '../copy/authCopy';

export interface SignInFormValues {
  email: string;
  password: string;
}

export interface CreateAccountFormValues {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordFormValues {
  email: string;
}

export interface SignInFormErrors {
  email?: string;
  password?: string;
}

export interface CreateAccountFormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export interface ForgotPasswordFormErrors {
  email?: string;
}

/** Obvious email shape only. Not a security rule. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (trimmed.length === 0) {
    return authCopy.validation.emailRequired;
  }
  if (!EMAIL_SHAPE.test(trimmed)) {
    return authCopy.validation.emailInvalid;
  }
  return undefined;
}

export function validateRequiredPassword(password: string): string | undefined {
  if (password.length === 0) {
    return authCopy.validation.passwordRequired;
  }
  return undefined;
}

export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string,
): string | undefined {
  if (confirmPassword.length === 0) {
    return authCopy.validation.confirmPasswordRequired;
  }
  if (password !== confirmPassword) {
    return authCopy.validation.passwordMismatch;
  }
  return undefined;
}

export function validateSignInForm(values: SignInFormValues): SignInFormErrors {
  return {
    email: validateEmail(values.email),
    password: validateRequiredPassword(values.password),
  };
}

export function validateCreateAccountForm(
  values: CreateAccountFormValues,
): CreateAccountFormErrors {
  return {
    email: validateEmail(values.email),
    password: validateRequiredPassword(values.password),
    confirmPassword: validatePasswordConfirmation(
      values.password,
      values.confirmPassword,
    ),
  };
}

export function validateForgotPasswordForm(
  values: ForgotPasswordFormValues,
): ForgotPasswordFormErrors {
  return {
    email: validateEmail(values.email),
  };
}

export function hasFormErrors(
  errors: SignInFormErrors | CreateAccountFormErrors | ForgotPasswordFormErrors,
): boolean {
  return Object.values(errors).some((message) => message !== undefined);
}
