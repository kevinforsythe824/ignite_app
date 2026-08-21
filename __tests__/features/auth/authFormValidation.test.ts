import {
  hasFormErrors,
  validateCreateAccountForm,
  validateEmail,
  validateForgotPasswordForm,
  validatePasswordConfirmation,
  validateRequiredPassword,
  validateSignInForm,
} from '../../../src/features/auth/validation/authFormValidation';
import { authCopy } from '../../../src/features/auth/copy/authCopy';

describe('authFormValidation', () => {
  describe('validateEmail', () => {
    it('requires an email', () => {
      expect(validateEmail('')).toBe(authCopy.validation.emailRequired);
      expect(validateEmail('   ')).toBe(authCopy.validation.emailRequired);
    });

    it('rejects an obviously invalid email shape', () => {
      expect(validateEmail('not-an-email')).toBe(authCopy.validation.emailInvalid);
      expect(validateEmail('missing-domain@')).toBe(authCopy.validation.emailInvalid);
    });

    it('accepts a typical email', () => {
      expect(validateEmail('quizzer@example.com')).toBeUndefined();
      expect(validateEmail('  quizzer@example.com  ')).toBeUndefined();
    });
  });

  describe('validateRequiredPassword', () => {
    it('requires a non-empty password without inventing a length policy', () => {
      expect(validateRequiredPassword('')).toBe(authCopy.validation.passwordRequired);
      expect(validateRequiredPassword('1')).toBeUndefined();
    });
  });

  describe('validatePasswordConfirmation', () => {
    it('requires confirmation and matching values', () => {
      expect(validatePasswordConfirmation('secret', '')).toBe(
        authCopy.validation.confirmPasswordRequired,
      );
      expect(validatePasswordConfirmation('secret', 'other')).toBe(
        authCopy.validation.passwordMismatch,
      );
      expect(validatePasswordConfirmation('secret', 'secret')).toBeUndefined();
    });
  });

  describe('form helpers', () => {
    it('validates sign-in fields together', () => {
      const errors = validateSignInForm({ email: '', password: '' });
      expect(hasFormErrors(errors)).toBe(true);
      expect(errors.email).toBe(authCopy.validation.emailRequired);
      expect(errors.password).toBe(authCopy.validation.passwordRequired);
    });

    it('validates create-account confirmation mismatch', () => {
      const errors = validateCreateAccountForm({
        email: 'quizzer@example.com',
        password: 'secret',
        confirmPassword: 'different',
      });
      expect(hasFormErrors(errors)).toBe(true);
      expect(errors.confirmPassword).toBe(authCopy.validation.passwordMismatch);
    });

    it('validates forgot-password email only', () => {
      const errors = validateForgotPasswordForm({ email: 'bad' });
      expect(errors.email).toBe(authCopy.validation.emailInvalid);
      expect(hasFormErrors(validateForgotPasswordForm({ email: 'quizzer@example.com' }))).toBe(
        false,
      );
    });
  });
});
