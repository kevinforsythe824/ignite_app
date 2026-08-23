/** User-facing Quizzer profile / name-onboarding copy. */
export const quizzerProfileCopy = {
  name: {
    title: 'Enter your name',
    supporting: 'This is how you’ll appear in Ignite.',
    firstName: 'First name',
    lastName: 'Last name',
    submit: 'Continue',
    submitting: 'Saving',
    firstNameRequired: 'Enter your first name.',
    lastNameRequired: 'Enter your last name.',
  },
  loadError: {
    title: 'We couldn’t load your profile',
    supporting: 'Check your connection and try again.',
    tryAgain: 'Try Again',
  },
  loading: {
    accessibilityLabel: 'Loading your profile',
  },
  actions: {
    signOut: 'Sign Out',
  },
} as const;
