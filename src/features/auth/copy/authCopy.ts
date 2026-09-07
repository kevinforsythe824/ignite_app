/** User-facing authentication copy. Keep editable; do not scatter literals across screens. */
export const authCopy = {
  brand: {
    name: 'Ignite',
    accessibilityLabel: 'Ignite',
  },
  welcome: {
    headlinePrimary: 'Study with purpose.',
    headlineAccent: 'Compete with confidence.',
    supporting: 'Memorize scripture, strengthen recall, and prepare to quiz.',
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
    title: 'How old is the Quizzer?',
    supporting:
      'If a parent is creating an account for a Quizzer under 13, choose Under 13. Ignite does not collect a date of birth here.',
    question: 'Choose the path that matches the Quizzer’s age.',
    thirteenOrOlder: '13 or older',
    underThirteen: 'Under 13',
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
