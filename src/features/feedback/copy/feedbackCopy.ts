/** User-facing Help & Feedback copy. Keep editable; do not scatter literals. */
export const feedbackCopy = {
  hub: {
    title: 'Help & Feedback',
    supporting: 'Tell us about a problem, a feature idea, or general feedback.',
    reportBug: 'Report a Bug',
    requestFeature: 'Request a Feature',
    general: 'General Feedback',
  },
  compose: {
    bugTitle: 'Report a Bug',
    featureTitle: 'Request a Feature',
    generalTitle: 'General Feedback',
    titleLabel: 'Title (optional)',
    messageLabel: 'Message',
    privacyNote:
      'Do not include passwords, names, emails, or other personal details. We collect only the category, your message, app version, and device type to help diagnose issues.',
    submit: 'Submit',
    submitting: 'Sending',
    messageRequired: 'Enter a message.',
    titleTooLong: 'Shorten the title.',
    messageTooLong: 'Shorten the message.',
  },
  success: {
    title: 'Thanks for your feedback',
    body: 'We received your message. A person will review it — this does not create a support ticket.',
    done: 'Done',
  },
  errors: {
    invalidArgument: 'Check your message and try again.',
    unauthenticated: 'Sign in to send feedback.',
    unavailable: 'Unable to send feedback right now. Check your connection and try again.',
    network: 'Unable to send feedback right now. Check your connection and try again.',
    unexpected: 'Unable to send feedback. Try again.',
  },
} as const;
