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
    helper: "Choose the division you'll compete in this season.",
    unavailable: "Division choices aren't available right now.",
  },
  firstYear: {
    title: 'First year',
    question: 'Is this your first year ever participating in Bible Quizzing?',
    helper: "If you've participated in Bible Quizzing in any division before, choose No.",
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
  region: {
    title: 'Choose a region',
    helper: 'Choose the region where you quiz.',
    unavailable: "Region choices aren't available right now.",
  },
  review: {
    title: 'Review',
    season: 'Season',
    division: 'Division',
    studyMaterial: 'Study material',
    region: 'Region',
    change: 'Change',
    changeRegion: 'Change region',
    confirm: 'Confirm',
    confirming: 'Saving your season',
    unavailable: "Season setup isn't available right now.",
    complete: 'Your season is ready.',
  },
  loading: {
    title: 'Preparing your season…',
  },
  catalog: {
    title: 'Season setup',
    unavailable: "Season setup isn't available right now.",
    temporarilyUnavailable:
      'Season setup is temporarily unavailable. Check your connection and try again.',
    retry: 'Try again',
  },
} as const;
