/** User-facing authentication copy. Keep editable; do not scatter literals across screens. */
export const authCopy = {
  brand: {
    name: 'Ignite',
    accessibilityLabel: 'Ignite',
  },
  welcome: {
    headlinePrimary: 'Study with purpose.',
    headlineAccent: 'Compete with confidence.',
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
    title: 'How old is the Quizzer today?',
    supporting: 'This helps us set up the account correctly.',
    fieldLabel: 'Current age',
    continue: 'Continue',
    underThirteenVerificationNotice: 'Parent or guardian verification is required.',
    wholeNumber: 'Enter the Quizzer’s age as a whole number.',
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
