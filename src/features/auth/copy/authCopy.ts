/** User-facing authentication copy. Keep editable; do not scatter literals across screens. */
export const authCopy = {
  brand: {
    name: 'Ignite',
    accessibilityLabel: 'Ignite',
  },
  welcome: {
    supporting: 'Memorize Scripture. Prepare to compete.',
    createAccount: 'Create Account',
    signInPrompt: 'Already have an account?',
    signIn: 'Sign In',
  },
  signIn: {
    title: 'Sign In',
    supporting: 'Welcome back.',
    submit: 'Sign In',
    submitting: 'Signing in',
    forgotPassword: 'Forgot Password',
  },
  createAccount: {
    title: 'Create your account',
    supporting: 'Start preparing with Ignite.',
    submit: 'Create Account',
    submitting: 'Creating account',
    passwordGuidance: 'Choose a password you can remember.',
  },
  forgotPassword: {
    title: 'Reset your password',
    supporting: "We'll send reset instructions to your email.",
    submit: 'Send Reset Instructions',
    submitting: 'Sending reset instructions',
    success:
      'If an account exists for that email, reset instructions have been sent.',
  },
  fields: {
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },
  actions: {
    back: 'Back',
  },
  validation: {
    emailRequired: 'Enter your email address.',
    emailInvalid: 'Enter a valid email address.',
    passwordRequired: 'Enter your password.',
    confirmPasswordRequired: 'Confirm your password.',
    passwordMismatch: 'Passwords do not match.',
  },
  errors: {
    unexpected: 'Unable to complete authentication.',
  },
} as const;
