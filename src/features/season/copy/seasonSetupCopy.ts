/**
 * User-facing Season Setup copy.
 * Explains the screen. Does not decide eligibility, division, or MaterialSet ids.
 */
export const seasonSetupCopy = {
  actions: {
    continue: 'Continue',
  },
  age: {
    title: 'Eligibility age',
    fieldLabel: 'Age on January 1',
    helper:
      "Bible Quizzing eligibility uses your age on January 1. If you're unsure, check with your Coach.",
    unavailable: "Season setup isn't available right now.",
    wholeNumber: 'Enter your age as a whole number.',
    cannotContinue: "That age can't continue. If you're unsure, check with your Coach.",
  },
  placement: {
    title: 'Choose a division',
    helper:
      'For ages 2–4, a parent or Coach can choose the material level that is the best fit.',
    unavailable: "Division choices aren't available right now.",
  },
  firstYear: {
    title: 'First year',
    question: 'Is this your first year participating in Bible Quizzing?',
    helper: "If you're unsure, check with your Coach.",
    yes: 'Yes',
    no: 'No',
    unavailable: "This question isn't available right now.",
    divisionOutcome: (label: string) => `Your division: ${label}`,
  },
  studyTrack: {
    title: 'Study Track',
    body:
      'Study Track is study material, not a competitive youth division. One official set is used for the season and stays locked for the season.',
    helper: 'Choose the study material for this season.',
    unavailable: "Study Track choices aren't available right now.",
  },
  choice: {
    selected: 'Selected',
  },
} as const;
