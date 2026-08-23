/** User-facing authentication copy. Keep editable; do not scatter literals across screens. */
export const authCopy = {
  brand: {
    name: 'Ignite',
    accessibilityLabel: 'Ignite',
  },
  welcome: {
    tagline: 'Study. Practice. Compete.',
    createAccount: 'Create Account',
    signInPrompt: 'Already have an account?',
    signIn: 'Sign In',
    valueItems: [
      {
        id: 'study',
        title: 'Study Scripture',
        description: 'Learn your season material.',
        icon: 'book-outline' as const,
      },
      {
        id: 'confidence',
        title: 'Build Confidence',
        description: 'Strengthen recall as you study.',
        icon: 'checkmark-circle-outline' as const,
      },
      {
        id: 'ready',
        title: 'Be Quiz Ready',
        description: 'Prepare for competition.',
        icon: 'flash-outline' as const,
      },
    ],
  },
  signIn: {
    title: 'Sign In',
    supporting: 'Welcome back.',
    submit: 'Sign In',
    submitting: 'Signing in',
    forgotPassword: 'Forgot Password?',
    createAccountPrompt: 'New to Ignite?',
    createAccount: 'Create Account',
  },
  createAccount: {
    title: 'Create your account',
    supporting: 'Start studying with Ignite.',
    submit: 'Create Account',
    submitting: 'Creating account',
    signInPrompt: 'Already have an account?',
    signIn: 'Sign In',
  },
  forgotPassword: {
    title: 'Reset your password',
    supporting: "We'll send reset instructions to your email.",
    submit: 'Send Reset Instructions',
    submitting: 'Sending reset instructions',
    backToSignIn: 'Back to Sign In',
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
    signOut: 'Sign Out',
    tryAgain: 'Try Again',
    continue: 'Continue',
  },
  privacyAge: {
    title: 'Before we continue',
    supporting: 'Ignite needs to know which account path is right for you.',
    question: 'Are you 13 or older?',
    thirteenOrOlder: 'I am 13 or older',
    underThirteen: 'I am under 13',
  },
  underThirteenBlocked: {
    title: 'Account creation isn’t available on this path yet',
    body:
      'If you’re under 13, Ignite can’t finish creating an account in this version of the app. A parent- or guardian-approved path will be added later. You can go back to Welcome.',
    backToWelcome: 'Back to Welcome',
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
