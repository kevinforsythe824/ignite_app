/** User-facing parental consent copy. Keep editable; do not scatter literals. */
export const parentalConsentCopy = {
  intro: {
    title: 'A parent or guardian must approve',
    body:
      'Ignite will email a parent or guardian so they can review and approve account creation for this Quizzer. After they approve, return here to finish creating the account.',
    continue: 'Continue',
  },
  parentEmail: {
    title: 'Parent or guardian email',
    supporting:
      'We will send an approval request to this email. Use a parent or guardian address — not the Quizzer’s.',
    fieldLabel: 'Parent or guardian email',
    submit: 'Send approval request',
    submitting: 'Sending approval request',
  },
  pending: {
    title: 'Waiting for parent approval',
    supporting: (maskedEmail: string) =>
      `We sent an approval request to ${maskedEmail}. When a parent or guardian approves, tap Check Again.`,
    checkAgain: 'Check Again',
    checking: 'Checking',
    resend: 'Resend email',
    resending: 'Resending',
    changeEmail: 'Change email',
    deliveryFailed:
      'We could not deliver the email just now. You can try Resend, or check that the address is correct.',
  },
  changeEmail: {
    title: 'Change parent email',
    supporting: 'We will send a new approval request to the updated address.',
    submit: 'Update email',
    submitting: 'Updating email',
  },
  recovery: {
    title: 'Parent approval needs attention',
    expired:
      'This approval request has expired. Start over to send a new request to a parent or guardian.',
    revoked:
      'This approval request was revoked. Start over to send a new request to a parent or guardian.',
    invalidSession:
      'This approval session is no longer valid. Start over to send a new request.',
    approvedBound:
      'This parent approval is already linked to an account. Sign in to that account, or start over only if you need a different path.',
    network:
      'We could not check parent approval right now. Check your connection and try again.',
    generic:
      'We could not continue with this parent approval. Start over to send a new request, or sign in if you already have an account.',
    startOver: 'Start over',
    signIn: 'Sign In',
    continueApproval: 'Continue parent approval',
    tryAgain: 'Try Again',
  },
  claimPending: {
    title: 'Finishing parent approval',
    body: 'Connecting your account to the approved parent consent…',
    retry: 'Retry',
    signingOut: 'Sign Out',
    transient:
      'We could not finish parent approval just now. Check your connection and try again.',
    /**
     * Authenticated session present but claim callable still rejected auth context.
     * Not a network failure; not "Sign in to finish" (user is already signed in).
     */
    authContext:
      'We could not verify your signed-in session for parent approval. Tap Retry.',
    terminal:
      'Parent approval could not be finished for this account. Sign out, complete a new parent approval, then sign in with this same account.',
  },
  privacyAge: {
    activeConsentPrompt:
      'A parent approval is already in progress for this Quizzer. Continue that path, or start over if you selected the wrong age.',
    continueApproval: 'Continue parent approval',
    startOver: 'Start over / I selected the wrong age',
    startOverConfirmTitle: 'Start over?',
    startOverConfirmBody:
      'This clears the current parent-approval request on this device. You can choose the age path again afterward.',
    startOverConfirm: 'Start over',
    startOverCancel: 'Cancel',
  },
  createAccount: {
    gateBlocked: 'Parent approval is required before creating this account.',
  },
  validation: {
    emailRequired: 'Enter a parent or guardian email address.',
    emailInvalid: 'Enter a valid email address.',
  },
  errors: {
    invalidArgument: 'Check the parent email and try again.',
    unauthenticated: 'Sign in to finish parent approval.',
    permissionDenied: 'This approval session is no longer valid. Start over to send a new request.',
    notFound: 'We could not find that approval request. Start over to send a new request.',
    alreadyExists:
      'This parent approval is already linked to another account. Sign in to that account, or start over.',
    failedPrecondition:
      'Parent approval is not ready yet. Check again after a parent or guardian approves.',
    resourceExhausted: 'Please wait before requesting another notice.',
    unavailable: 'Unable to reach the approval service. Check your connection.',
    network: 'Unable to reach the approval service. Check your connection.',
    unexpected: 'Unable to complete parent approval.',
  },
} as const;
